import json
import subprocess
from pathlib import Path

import httpx
import numpy as np
import pytest
from fastapi.testclient import TestClient
from scipy.interpolate import PchipInterpolator

from backend import app as module

@pytest.fixture(autouse=True)
def isolation(monkeypatch):
    module.requests.clear()
    module.budget.update(day='',count=0)
    monkeypatch.delenv('OPENAI_API_KEY', raising=False)

@pytest.fixture
def client():
    return TestClient(module.app)

def schema():
    return [{'name':'X','type':'number','missing':0},{'name':'Y','type':'number','missing':0}]

def payload():
    return {'prompt':'选择拟合模型','columns':schema(),'consent':True}

def valid_plan():
    return {'chart':'scatter','x':'X','y':['Y'],'formula':None,'model':'linear','explanation':'先作描述性线性拟合'}

def mocked(monkeypatch, callback):
    monkeypatch.setenv('OPENAI_API_KEY','test-only-key')
    cls=httpx.AsyncClient
    monkeypatch.setattr(module.httpx,'AsyncClient',lambda **kw: cls(transport=httpx.MockTransport(callback), **kw))

def test_health_ai_unconfigured_and_capabilities(client):
    assert client.get('/health').json()['ai_configured'] is False
    assert client.post('/plan',json=payload()).status_code == 503
    assert client.get('/capabilities').json()['future_interfaces']['projects']=='not_implemented'

def test_no_consent_extra_fields_and_limits(client):
    p=payload();p['consent']=False
    assert client.post('/plan',json=p).status_code==422
    p=payload();p['code']='malicious()'
    assert client.post('/plan',json=p).status_code==422
    assert client.post('/plan',content='a'*512001).status_code==413

def test_ai_valid_strict_plan(client,monkeypatch):
    def respond(request):
        body=json.loads(request.content)
        assert body['response_format']['json_schema']['strict'] is True
        assert 'test-only-key' not in request.content.decode()
        assert 'rows' not in body['messages'][1]['content']
        return httpx.Response(200,json={'choices':[{'message':{'content':json.dumps(valid_plan())}}]})
    mocked(monkeypatch,respond)
    assert client.post('/plan',json=payload()).json()==valid_plan()

@pytest.mark.parametrize('change',[{'model':'execute'},{'formula':'__proto__'},{'x':'secret'},{'y':['secret']},{'code':'arbitrary()'}])
def test_ai_illegal_plan_rejected(client,monkeypatch,change):
    invalid={**valid_plan(),**change}
    mocked(monkeypatch,lambda r:httpx.Response(200,json={'choices':[{'message':{'content':json.dumps(invalid)}}]}))
    assert client.post('/plan',json=payload()).status_code==502

def test_ai_timeout(client,monkeypatch):
    def timeout(request):
        raise httpx.ReadTimeout('test timeout')
    mocked(monkeypatch,timeout)
    result=client.post('/plan',json=payload())
    assert result.status_code==504
    assert '超时' in result.json()['detail']

def test_budget_prevents_upstream_call(client,monkeypatch):
    monkeypatch.setenv('OPENAI_API_KEY','test-only-key')
    monkeypatch.setenv('AI_DAILY_REQUEST_LIMIT','0')
    assert client.post('/plan',json=payload()).status_code==429

def test_api_rate_limit(client):
    assert all(client.get('/health').status_code==200 for _ in range(20))
    assert client.get('/health').status_code==429

def test_numpy_regression_known_values(client):
    result=client.post('/compute',json={'x':[0,1,2,4,9],'y':[3,5,7,11,21],'model':'linear','consent':True})
    assert result.status_code==200
    m=result.json()
    assert m['rmse']<1e-12
    assert m['r2']==pytest.approx(1)
    assert m['curve'][0][1]==pytest.approx(3)

def test_interpolation_and_smoothing_conditions(client):
    base={'x':[0,1,1,3],'y':[1,2,3,4],'consent':True}
    assert client.post('/compute',json={**base,'model':'pchip'}).status_code==422
    base['x']=[0,1,3,5]
    assert client.post('/compute',json={**base,'model':'savitzkyGolay','window':3,'degree':1}).status_code==422
    for method in ['pchip','piecewise','cubicSpline']:
        m=client.post('/compute',json={**base,'model':method}).json()
        assert m['kind']=='Interpolation'
        assert m['curve'][0]==[0,1]
        assert m['curve'][-1]==[5,4]

def test_frontend_numerics_against_independent_numpy_scipy():
    root=Path(__file__).resolve().parents[2]
    script="""import {fit,regression} from './src/engine.js';
const points=[[0,2],[.3,2.5],[1,2.7],[2,8],[5,10],[9,11]];
const m=fit(points,'pchip'),r=regression(points,2);
console.log(JSON.stringify({points,curve:m.curve,pred:points.map(p=>r.predict(p[0])),rmse:r.rmse}));"""
    result=subprocess.run(['node','--input-type=module','-e',script],cwd=root,capture_output=True,text=True,check=True)
    m=json.loads(result.stdout)
    x,y=np.array(m['points']).T
    cx,cy=np.array(m['curve']).T
    assert np.max(np.abs(PchipInterpolator(x,y)(cx)-cy)) < 1e-12
    independently=np.polynomial.Polynomial.fit(x,y,2)(x)
    assert np.max(np.abs(independently-m['pred'])) < 1e-12
    assert m['rmse']==pytest.approx(float(np.sqrt(np.mean((y-independently)**2))),abs=1e-12)
