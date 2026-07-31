const measures=[
  {id:'brixUrine',label:'Brix urinaire'},
  {id:'densityUrine',label:'Densité urinaire'},
  {id:'phUrine',label:'pH urinaire'},
  {id:'redoxUrine',label:'Redox urinaire'},
  {id:'phFeces',label:'pH des bouses'},
  {id:'redoxFeces',label:'Redox des bouses'}
];
const contexts=['Chaleur','Changement de ration','Transition alimentaire','Baisse de production','Amaigrissement','Diarrhées','Bouses irrégulières','Eau douteuse','Accès à l’eau limité','Tri de ration','Fourrage nouveau','Stress ou compétition'];
const labels={low:'Bas',normal:'Normal',high:'Haut',na:'Non mesuré'};
let currentResult=null; let deferredPrompt=null;

const measureGrid=document.getElementById('measureGrid');
measures.forEach(m=>{
  const row=document.createElement('div'); row.className='measure-row';
  row.innerHTML=`<div class="measure-head"><span class="measure-name">${m.label}</span></div><div class="segmented">${['low','normal','high','na'].map((v,i)=>`<input type="radio" id="${m.id}-${v}" name="${m.id}" value="${v}" ${v==='na'?'checked':''}><label for="${m.id}-${v}">${labels[v]}</label>`).join('')}</div>`;
  measureGrid.appendChild(row);
});
const contextGrid=document.getElementById('contextGrid');
contexts.forEach((c,i)=>{const w=document.createElement('span');w.className='chip';w.innerHTML=`<input type="checkbox" id="ctx-${i}" value="${c}"><label for="ctx-${i}">${c}</label>`;contextGrid.appendChild(w)});
document.getElementById('visitDate').value=new Date().toISOString().slice(0,10);

function getFormData(){
  const values={}; measures.forEach(m=>values[m.id]=document.querySelector(`input[name="${m.id}"]:checked`).value);
  return {id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),createdAt:new Date().toISOString(),farm:document.getElementById('farm').value.trim()||'Élevage non renseigné',visitDate:document.getElementById('visitDate').value,species:document.getElementById('species').value,category:document.getElementById('category').value.trim(),animalCount:document.getElementById('animalCount').value,reason:document.getElementById('reason').value.trim(),notes:document.getElementById('notes').value.trim(),contexts:[...document.querySelectorAll('#contextGrid input:checked')].map(x=>x.value),values};
}
const is=(d,k,v)=>d.values[k]===v; const has=(d,c)=>d.contexts.includes(c);
function addHyp(list,title,score,reasons,checks,actions,m){list.push({title,score,reasons,checks,actions,m})}
function analyse(d){
  const h=[]; const measured=Object.values(d.values).filter(v=>v!=='na').length;
  if(measured<2) addHyp(h,'Données insuffisantes pour une analyse croisée',25,['Moins de deux indicateurs ont été renseignés.'],['Réaliser plusieurs mesures sur un lot représentatif.'],['Compléter les données avant de conclure.'],{Méthode:30});
  if(is(d,'brixUrine','high')&&is(d,'densityUrine','high')) addHyp(h,'Urines concentrées / abreuvement à explorer',88,['Brix urinaire haut','Densité urinaire haute',...(has(d,'Chaleur')?['Contexte de chaleur']:[]),...(has(d,'Accès à l’eau limité')?['Accès à l’eau signalé comme limité']:[])],['Contrôler le débit et le nombre d’abreuvoirs','Observer la compétition et le temps d’accès','Répéter les mesures à un autre moment de la journée'],['Sécuriser l’accès à une eau propre et disponible','Vérifier rapidement les équipements d’abreuvement'],{Matière:85,Milieu:70,Matériel:75,Méthode:45,'Main-d’œuvre':25});
  if(is(d,'brixUrine','low')&&is(d,'densityUrine','low')) addHyp(h,'Urines très diluées / profil à recontrôler',66,['Brix urinaire bas','Densité urinaire basse'],['Vérifier l’heure et les conditions de prélèvement','Recontrôler sur plusieurs animaux','Mettre en relation avec consommation d’eau et état clinique'],['Éviter une interprétation isolée','Documenter les conditions de prélèvement'],{Méthode:65,Matière:40,Milieu:25});
  if(is(d,'phFeces','low')&&(is(d,'redoxFeces','high')||has(d,'Transition alimentaire')||has(d,'Changement de ration'))) addHyp(h,'Fermentation digestive rapide / ration fermentescible à explorer',82,['pH des bouses bas',...(is(d,'redoxFeces','high')?['Redox des bouses haut']:[]),...(has(d,'Transition alimentaire')?['Transition alimentaire en cours']:[])],['Observer la consistance et les particules dans les bouses','Contrôler le tri de ration','Vérifier amidon, sucres et fibres efficaces','Évaluer rumination et homogénéité du lot'],['Revoir la transition et la régularité de distribution','Sécuriser les fibres efficaces','Faire valider la ration'],{Matière:90,Méthode:80,Matériel:40,'Main-d’œuvre':35});
  if(is(d,'phFeces','high')&&is(d,'redoxFeces','low')) addHyp(h,'Digestion lente ou incomplète à explorer',72,['pH des bouses haut','Redox des bouses bas'],['Observer les fibres et grains non digérés','Contrôler la qualité et l’ingestibilité des fourrages','Évaluer le niveau d’ingestion et la rumination'],['Vérifier la structure de ration','Contrôler la qualité de mélange et de distribution'],{Matière:82,Méthode:58,Matériel:45});
  if(is(d,'phUrine','low')&&(is(d,'phFeces','low')||is(d,'redoxUrine','high'))) addHyp(h,'Profil acide concordant à interpréter selon la catégorie',78,['pH urinaire bas',...(is(d,'phFeces','low')?['pH des bouses bas']:[]),...(is(d,'redoxUrine','high')?['Redox urinaire haut']:[])],['Préciser le statut physiologique et les objectifs de ration','Vérifier la ration minérale et l’équilibre alimentaire','Comparer avec signes cliniques et performances'],['Ne pas conclure sans les valeurs de référence propres à la catégorie','Faire confirmer l’interprétation de la ration'],{Matière:88,Méthode:60});
  if(is(d,'phUrine','high')&&is(d,'phFeces','high')) addHyp(h,'Profil alcalin concordant à contextualiser',70,['pH urinaire haut','pH des bouses haut'],['Contrôler catégorie animale, ration et minéraux','Vérifier les conditions de prélèvement','Rechercher une cohérence avec ingestion et performances'],['Comparer aux objectifs propres au lot','Recontrôler avant toute modification de ration'],{Matière:75,Méthode:55});
  if((is(d,'redoxUrine','high')&&is(d,'redoxFeces','high'))||(is(d,'redoxUrine','low')&&is(d,'redoxFeces','low'))) addHyp(h,'Profil Redox concordant entre urine et bouses',64,['Redox urinaire et fécal orientés dans le même sens'],['Vérifier l’étalonnage des appareils','Contrôler le délai entre prélèvement et lecture','Répéter sur plusieurs animaux'],['Standardiser le protocole de mesure','Interpréter avec pH, ration et clinique'],{Méthode:78,Matériel:62,Matière:45});
  const discord=(is(d,'brixUrine','high')&&is(d,'densityUrine','low'))||(is(d,'brixUrine','low')&&is(d,'densityUrine','high'));
  if(discord) addHyp(h,'Discordance Brix–densité : mesure à vérifier',80,['Brix et densité urinaire évoluent en sens opposés'],['Reprendre les mesures sur le même prélèvement','Nettoyer et étalonner les appareils','Contrôler température et délai de lecture'],['Ne pas interpréter ce couple avant vérification','Standardiser le prélèvement'],{Méthode:90,Matériel:85});
  if(has(d,'Eau douteuse')) addHyp(h,'Qualité de l’eau à contrôler',62,['Une qualité d’eau douteuse est signalée'],['Aspect, odeur, propreté des bacs','Analyse physico-chimique et bactériologique si nécessaire','État des canalisations et fréquence de nettoyage'],['Nettoyer les points d’eau','Programmer un contrôle de qualité'],{Matière:78,Matériel:62,Milieu:48});
  if(has(d,'Tri de ration')) addHyp(h,'Tri de ration susceptible d’expliquer l’hétérogénéité',60,['Tri de ration observé'],['Comparer ration distribuée et refus','Contrôler longueur des fibres et homogénéité du mélange','Observer l’accès à l’auge'],['Limiter le tri','Revoir mélange, humidité et fréquence de repousse'],{Matière:70,Matériel:65,Méthode:76,'Main-d’œuvre':45});
  h.sort((a,b)=>b.score-a.score);
  const allNormal=measured>0&&Object.values(d.values).filter(v=>v!=='na').every(v=>v==='normal');
  if(allNormal) addHyp(h,'Profil déclaré globalement dans les normes',45,['Toutes les mesures renseignées sont classées normales.'],['Vérifier que les références utilisées sont adaptées au lot','Conserver les observations cliniques et zootechniques'],['Poursuivre la surveillance','Comparer lors de la prochaine visite'],{Méthode:25,Matière:20});
  const five={Matière:0,Milieu:0,Méthode:0,Matériel:0,'Main-d’œuvre':0}; h.forEach(x=>Object.entries(x.m||{}).forEach(([k,v])=>five[k]=Math.max(five[k]||0,v)));
  const coherence=discord?'Mesures discordantes':measured<2?'Données insuffisantes':h.some(x=>x.score>=80)?'Concordance forte':'Orientation modérée';
  return {data:d,hypotheses:h.slice(0,5),five,coherence,measured};
}
function renderResult(r){
  currentResult=r; const {data:d,hypotheses:h,five,coherence,measured}=r;
  document.getElementById('resultTitle').textContent=h[0]?.title||'Aucune orientation majeure';
  document.getElementById('resultSummary').textContent=`${measured} indicateur(s) renseigné(s). ${h.length?`L'analyse propose ${h.length} piste(s) à explorer.`:'Aucune combinaison notable détectée.'}`;
  const badge=document.getElementById('coherenceBadge');badge.textContent=coherence;badge.className='badge '+(coherence==='Concordance forte'?'bad':coherence==='Orientation modérée'?'warn':coherence==='Mesures discordantes'?'bad':'warn');
  document.getElementById('hypotheses').innerHTML=h.length?h.map(x=>`<article class="hypothesis"><div class="hypothesis-top"><strong>${x.title}</strong><span class="level ${x.score>=80?'high':x.score>=60?'medium':'low'}">${x.score>=80?'Concordance forte':x.score>=60?'À explorer':'Faible'}</span></div><ul class="reason-list">${x.reasons.map(y=>`<li>${y}</li>`).join('')}</ul></article>`).join(''):'<p class="muted">Aucune orientation notable.</p>';
  document.getElementById('fiveM').innerHTML=Object.entries(five).map(([k,v])=>`<div class="m-row"><strong>${k}</strong><div class="m-track"><div class="m-fill" style="width:${v}%"></div></div><span class="m-score">${v}%</span></div>`).join('');
  const checks=[...new Set(h.flatMap(x=>x.checks))]; const acts=[...new Set(h.flatMap(x=>x.actions))];
  document.getElementById('checks').innerHTML=checks.length?`<ul class="check-list">${checks.map(x=>`<li>${x}</li>`).join('')}</ul>`:'<p class="muted">Compléter les mesures et les observations.</p>';
  document.getElementById('actionsPlan').innerHTML=acts.length?`<ol class="action-list">${acts.map(x=>`<li>${x}</li>`).join('')}</ol>`:'<p class="muted">Aucune action spécifique proposée.</p>';
  document.getElementById('results').classList.remove('hidden');
  setTimeout(()=>document.getElementById('results').scrollIntoView({behavior:'smooth',block:'start'}),50);
}
document.getElementById('analysisForm').addEventListener('submit',e=>{e.preventDefault();renderResult(analyse(getFormData()))});
document.getElementById('resetBtn').addEventListener('click',()=>{document.getElementById('analysisForm').reset();document.getElementById('visitDate').value=new Date().toISOString().slice(0,10);measures.forEach(m=>document.getElementById(`${m.id}-na`).checked=true);document.getElementById('results').classList.add('hidden');currentResult=null});
document.getElementById('printBtn').addEventListener('click',()=>window.print());
function history(){return JSON.parse(localStorage.getItem('mvet-history')||'[]')} function saveHistory(v){localStorage.setItem('mvet-history',JSON.stringify(v));renderHistory()}
document.getElementById('saveBtn').addEventListener('click',()=>{if(!currentResult)return;const h=history();h.unshift(currentResult);saveHistory(h.slice(0,100));alert('Visite enregistrée sur cet appareil.');});
function renderHistory(){const list=document.getElementById('historyList');const h=history();list.innerHTML='';if(!h.length){list.innerHTML='<p class="muted">Aucune visite enregistrée.</p>';return}const t=document.getElementById('historyTemplate');h.forEach((item,i)=>{const n=t.content.cloneNode(true);n.querySelector('.h-farm').textContent=item.data.farm;n.querySelector('.h-meta').textContent=`${item.data.visitDate||''} · ${item.data.species}${item.data.category?' · '+item.data.category:''}`;n.querySelector('.h-title').textContent=item.hypotheses[0]?.title||'Analyse enregistrée';n.querySelector('.h-open').onclick=()=>{switchScreen('analyse');renderResult(item)};n.querySelector('.h-delete').onclick=()=>{const a=history();a.splice(i,1);saveHistory(a)};list.appendChild(n)});}
document.getElementById('clearHistoryBtn').addEventListener('click',()=>{if(confirm('Supprimer tout l’historique de cet appareil ?'))saveHistory([])});
function switchScreen(name){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.screen===name));document.getElementById(`screen-${name}`).classList.add('active');if(name==='history')renderHistory();window.scrollTo({top:0,behavior:'smooth'})}
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>switchScreen(t.dataset.screen)));
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;document.getElementById('installBtn').classList.remove('hidden')});
document.getElementById('installBtn').addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;document.getElementById('installBtn').classList.add('hidden')});
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
renderHistory();
