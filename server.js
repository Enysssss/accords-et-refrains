// Minimal static server for Accords & Refrains (no dependencies).
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=__dirname;
const PRIVATE=new Set(['/server.js','/package.json']);
const TYPES={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.json':'application/json'};
http.createServer((req,res)=>{
  let p=decodeURIComponent((req.url||'/').split('?')[0]);
  if(p.endsWith('/'))p+='index.html';
  if(PRIVATE.has(p)||p.startsWith('/.')){res.writeHead(404);return res.end()}
  let f=path.normalize(path.join(ROOT,p));
  if(!f.startsWith(ROOT)){res.writeHead(403);return res.end()}
  if(!path.extname(f)&&fs.existsSync(f+'.html'))f+='.html';
  fs.readFile(f,(err,data)=>{
    if(err){res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});return res.end('<p>Page introuvable. <a href="/">Retour</a></p>')}
    res.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream','Cache-Control':'public, max-age=300'});
    res.end(data);
  });
}).listen(process.env.PORT||3000,()=>console.log('Accords & Refrains on',process.env.PORT||3000));
