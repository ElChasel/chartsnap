export const STATIC_BUILD=import.meta.env.VITE_STATIC_BUILD==='true';
export const sitePath=(path)=>STATIC_BUILD?`${import.meta.env.BASE_URL}static-${path.replace(/^\//,'')}.html`:path;
