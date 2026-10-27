import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {VitePWA} from 'vite-plugin-pwa';
export default defineConfig({plugins:[react(),tailwindcss(),VitePWA({
 registerType:'prompt',
 includeAssets:['icons/*.png','audio/de/hallo.ogg','audio/de/ATTRIBUTION.md'],
 manifest:{id:'/',name:'Klar — немецкий язык',short_name:'Klar',description:'Грамматика, 1000 слов и ежедневная практика немецкого языка.',lang:'ru',start_url:'/',scope:'/',display:'standalone',background_color:'#f7f8fa',theme_color:'#245644',categories:['education'],icons:[{src:'/icons/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/icons/maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]},
 workbox:{globPatterns:['**/*.{js,css,html,png,svg,ogg,webmanifest}'],navigateFallback:'index.html',cleanupOutdatedCaches:true,navigateFallbackDenylist:[/^\/api\//,/^\/auth\//,/^\/cdn-cgi\//]},
 devOptions:{enabled:false}
})]});
