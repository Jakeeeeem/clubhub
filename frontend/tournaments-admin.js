async function api(path, opts = {}){
  opts.headers = opts.headers || { 'Content-Type':'application/json' };
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const ct = res.headers.get('content-type')||'';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}
const $ = id=>document.getElementById(id);
$('createTournament').addEventListener('click', async ()=>{
  try{
    const name = $('tName').value.trim();
    const type = $('tType').value;
    if (!name) return alert('Enter name');
    const res = await api('/api/tournaments',{method:'POST',body:JSON.stringify({name,type,teams:[]})});
    $('out').textContent = JSON.stringify(res,null,2);
  }catch(e){alert(e.message)}
});
$('genFixtures').addEventListener('click', async ()=>{
  try{
    const id = $('tEventId').value.trim();
    if (!id) return alert('Enter event id');
    const res = await api(`/api/tournaments/${id}/generate-fixtures`,{method:'POST',body:JSON.stringify({stageName:'Main Stage',type:'knockout'})});
    $('out').textContent = JSON.stringify(res,null,2);
  }catch(e){alert(e.message)}
});
