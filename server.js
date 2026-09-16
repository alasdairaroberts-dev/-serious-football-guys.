import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const league = JSON.parse(fs.readFileSync(path.join(__dirname,"league.json"),"utf8"));
const PORT = process.env.PORT || 3000;
const SEASON = Number(process.env.SEASON || 2026);

// The PDF only specifies "classic fantasy", no PPR, and 4/pass TD.
// The remaining values are conventional defaults and are intentionally easy to edit.
const scoring = {
  pass_yd: 1/25, pass_td: 4, pass_int: -2,
  rush_yd: 1/10, rush_td: 6,
  rec: 0, rec_yd: 1/10, rec_td: 6,
  fum_lost: -2
};

const aliases = {
  "Sam LaPorta":"sam laporta",
  "Jaxon Smith-Njigba":"jaxon smith-njigba",
  "De'Von Achane":"de'von achane",
  "D'Andre Swift":"d'andre swift",
  "Ja'Marr Chase":"ja'marr chase"
};

function points(s={}) {
  return +( (s.pass_yd||0)*scoring.pass_yd + (s.pass_td||0)*scoring.pass_td +
    (s.pass_int||0)*scoring.pass_int + (s.rush_yd||0)*scoring.rush_yd +
    (s.rush_td||0)*scoring.rush_td + (s.rec||0)*scoring.rec +
    (s.rec_yd||0)*scoring.rec_yd + (s.rec_td||0)*scoring.rec_td +
    (s.fum_lost||0)*scoring.fum_lost ).toFixed(2);
}

async function sleeperPlayers() {
  const r = await fetch("https://api.sleeper.app/v1/players/nfl?active=true");
  if(!r.ok) throw new Error("Player directory unavailable");
  return r.json();
}
async function sleeperStats(week) {
  const urls = [
    `https://api.sleeper.com/stats/nfl/${SEASON}/${week}?season_type=regular`,
    `https://api.sleeper.com/stats/nfl/regular/${SEASON}/${week}`
  ];
  for (const u of urls) {
    const r = await fetch(u);
    if(r.ok) {
      const x = await r.json();
      return Array.isArray(x) ? x : Object.entries(x).map(([player_id,stats])=>({player_id,stats}));
    }
  }
  throw new Error("Weekly stats feed unavailable");
}
function normalize(x){return x.toLowerCase().replace(/[’]/g,"'").replace(/\s+/g," ").trim()}
function statMap(rows){
  const m={};
  for(const row of rows){
    const id=String(row.player_id ?? row.player?.player_id ?? "");
    m[id]=row.stats || row;
  }
  return m;
}
async function scoreWeek(week){
  const [players, rows] = await Promise.all([sleeperPlayers(), sleeperStats(week)]);
  const byName={};
  for(const [id,p] of Object.entries(players)){
    const full=normalize(`${p.first_name||""} ${p.last_name||""}`);
    byName[full]=id;
  }
  const stats=statMap(rows);
  const teamScores=league.teams.map(t=>{
    const lineup=Object.entries(t.roster).map(([pos,name])=>{
      const key=normalize(aliases[name]||name);
      const id=byName[key];
      const s=id ? (stats[id]||{}) : {};
      return {pos,name,playerId:id||null,points:points(s),stats:s};
    });
    return {...t,lineup,total:+lineup.reduce((a,p)=>a+p.points,0).toFixed(2)};
  });
  return {season:SEASON,week,scoring,teamScores,matchups:(league.schedule[week]||[]).map(([a,b])=>[
    teamScores.find(t=>t.id===a),teamScores.find(t=>t.id===b)
  ])};
}

function send(res,status,body,type="application/json"){
  res.writeHead(status,{"Content-Type":type,"Cache-Control":"no-store"});
  res.end(type.includes("json")?JSON.stringify(body):body);
}
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://${req.headers.host}`);
    if(url.pathname==="/api/league") return send(res,200,{...league,season:SEASON,scoring});
    if(url.pathname==="/api/score"){
      const week=Math.max(1,Math.min(18,Number(url.searchParams.get("week")||1)));
      return send(res,200,await scoreWeek(week));
    }
    let p=url.pathname==="/"?"index.html":url.pathname.slice(1);
    p=path.normalize(p).replace(/^(\.\.[/\\])+/, "");
    const file=path.join(__dirname,"public",p);
    if(!file.startsWith(path.join(__dirname,"public"))||!fs.existsSync(file)) return send(res,404,"Not found","text/plain");
    const ext=path.extname(file);
    const types={".html":"text/html",".css":"text/css",".js":"text/javascript"};
    return send(res,200,fs.readFileSync(file),types[ext]||"application/octet-stream");
  }catch(e){ return send(res,500,{error:e.message}); }
});
server.listen(PORT,()=>console.log(`SFG running at http://localhost:${PORT}`));
