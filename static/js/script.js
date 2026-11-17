// 센서 데이터는 시안용. 공공장소용 화면 제한도 브라우저 수준의 시연 기능이며 인증/보안 기능은 아님.
let demo=[];
let mode='home';
const params=new URLSearchParams(location.search);
const qrParam=params.get('cabinet');
// 주소로 선택된 칸은 접속 세션 동안 고정: 화면 버튼으로 다른 칸에 전환하지 않음.
const qrCabinet=(qrParam==='1'||qrParam==='2')?Number(qrParam):null;
// 공공장소용은 하나의 공통 QR 사용. 과거 칸별 QR 주소도 공통 시작 화면으로 연결.
let publicSelected=1;
let publicUnlocked=null;
const prototypeSessions={};
let selected=qrCabinet||1;
let currentPage='home';let toastTimer;
let adminDetailView=false; // 관리자 화면에서 연 상세페이지인지 구분 (시연용)
const $=id=>document.getElementById(id);
function showToast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600)}
function stateLabel(c){return !c.occupied?'비어 있음':c.drying?'건조 중':'보관 중'}
function dryingEstimate(c){
  if(!c.occupied)return {text:'—',note:'신발이 없어 건조시간을 표시하지 않습니다.'};
  return {text:'데이터 수집 중',note:'건조 이력이 부족해 예상 시간을 제공할 수 없습니다.'};
}
function publicUserView(){return mode==='public' && currentPage!=='admin'}
function render(){
  $('home-mode-label').textContent=mode==='home'?'가정용 모드':'공공장소용 모드';
  $('current-mode-badge').textContent=mode==='home'?'가정용':'공공장소용';
  $('mode-description').textContent=mode==='home'?'로그인 없이 두 칸의 상태를 확인할 수 있어요.':'공통 QR로 접속해 칸을 선택하고 비밀번호로 이용합니다.';
  // 가정용에서만 전체 칸 목록 렌더링
  $('home-grid').innerHTML=mode==='home'?demo.map(c=>`<button class="cabinet-card" onclick="openCabinet(${c.id})"><div class="row"><strong>${String(c.id).padStart(2,'0')}번 칸</strong><span class="badge ${c.occupied?'red':'green'}">${c.occupied?'사용 중':'빈 칸'}</span></div><div class="art">${c.occupied?'👟':'🧺'}</div><div class="state">${stateLabel(c)} · 습도 ${c.humidity}%</div><span class="estimate-line">◷ 예상 건조시간: ${dryingEstimate(c).text}</span></button>`).join(''):'';
  $('cabinet-list').innerHTML=mode==='home'?demo.map(c=>`<button class="list-item" onclick="openCabinet(${c.id})"><div><strong>${c.id}번 신발장</strong><p>${stateLabel(c)} · ${c.humidity}% RH · 팬 ${c.drying?'ON':'OFF'}</p><p class="estimate-line">◷ 예상 건조시간: ${dryingEstimate(c).text}</p></div><span class="chev">›</span></button>`).join(''):'';
  $('cabinet-list-note').textContent=mode==='home'?'가정용 모드: 두 칸의 상태를 확인할 수 있어요.':'';
  $('qr-home-link').classList.toggle('hidden',mode==='public');
  $('qr-admin-link').classList.toggle('hidden',mode!=='public');
  renderPublicSlots();
  renderAdminCabinets();
  $('detail-back').textContent=mode==='public'?'← QR 시작 화면':'← 신발장 목록';
  document.querySelector('input[name="mode"][value="'+mode+'"]').checked=true;
  document.querySelectorAll('.setting-card').forEach(x=>x.classList.remove('selected'));
  $(mode==='home'?'home-choice':'public-choice').classList.add('selected');
  $('history-content').innerHTML='<div class="card history-empty-card"><div class="empty-illustration">🗒️</div><h3>아직 이용 기록이 없어요</h3><p class="small muted mt-9">서버와 데이터베이스를 연결하면 이용 내역이 여기에 표시돼요.</p></div>';
}
function navigate(page){
  if(page==='admin'){showToast('관리자 인증 기능은 준비 중입니다.');return;}
  // 기록은 독립 페이지가 아니라 관리자 화면 내부에만 존재합니다.
  if(page==='history'){showToast('기록은 관리자 페이지에서 확인할 수 있어요.');return;}
  const publicAllowed=['admin','public-start','public-password','detail'];
  if(mode==='public' && !publicAllowed.includes(page))page='public-start';
  if(mode==='public' && page==='detail' && !adminDetailView && publicUnlocked!==selected)page='public-start';
  if(page!=='detail' && page!=='admin')adminDetailView=false;
  currentPage=page;
  const entryPages=['qr','public-start','public-password'];
  document.body.classList.toggle('qr-entry-active',entryPages.includes(page));
  document.body.classList.toggle('public-user-active',mode==='public'&&page!=='admin'&&!adminDetailView);
  document.body.classList.toggle('admin-detail-active',page==='detail'&&adminDetailView);
  document.querySelectorAll('.page').forEach(el=>el.classList.toggle('active',el.id==='page-'+page));
  const navPage=page==='detail'?'cabinets':page==='admin'?'settings':page;
  document.querySelectorAll('.nav-btn').forEach(el=>el.classList.toggle('active',el.dataset.nav===navPage));
  if(page==='detail')renderDetail();
  if(page==='admin')render();
  if(page==='public-start')renderPublicSlots();
  if(page==='public-password')renderPublicPassword();
  window.scrollTo({top:0,behavior:'instant'});
}
function openCabinet(id){
  adminDetailView=false;
  if(mode==='public'){
    if(publicUnlocked!==id){showToast('비밀번호 인증 후 해당 칸을 확인할 수 있어요.');return;}
  }
  if(!demo.some(c=>c.id===id))return;
  selected=id;navigate('detail');
}
function backFromDetail(){
  if(adminDetailView){adminDetailView=false;navigate('admin');return;}
  if(mode==='public'){publicUnlocked=null;navigate('public-start')}
  else navigate('cabinets');
}
function renderQrLanding(){const n=String(selected).padStart(2,'0');$('qr-cabinet-title').textContent=selected+'번';$('qr-selected-cabinet').textContent=n+'번 칸';}
function enterQrCabinet(){if(mode==='public'){navigate('public-start');return;}openCabinet(selected)}
function renderDetail(){
  const c=demo.find(x=>x.id===selected);if(!c)return;
  $('detail-title').textContent=c.id+'번 신발장';$('detail-badge').textContent=stateLabel(c);$('detail-badge').className='badge '+(c.occupied?'red':'green');
  $('detail-icon').textContent=c.occupied?'👟':'🧺';$('detail-status').textContent=!c.occupied?'신발장이 비어 있어요':c.drying?'신발을 건조하고 있어요':'신발을 보관 중이에요';
  $('detail-desc').textContent=c.drying?'환기 팬이 작동하고 있어요.':'환기 팬이 꺼져 있어요.';
  $('detail-temp').textContent=(Number.isFinite(c.temp)?c.temp.toFixed(1):'—')+'°C';$('detail-humidity').textContent=c.humidity+'%';
  $('detail-fan').textContent=c.drying?'ON':'OFF';$('detail-shoes').textContent=c.occupied?'있음':'없음';
  const estimate=dryingEstimate(c);
  $('detail-estimate').textContent=estimate.text;
  $('detail-estimate-note').textContent=estimate.note;
  $('detail-back').textContent=adminDetailView?'← 관리자 페이지':mode==='public'?'← QR 시작 화면':'← 신발장 목록';
  $('detail-access-note').textContent=adminDetailView?'관리자 상태 확인 화면입니다. 실제 관리자 인증은 서버 연결 후 적용해야 합니다.':mode==='public'?'공공장소용 프로토타입: 비밀번호 입력 UI만 구현되어 있습니다. 실제 문 제어와 접근 보안은 Flask 연결 후 구현합니다.':'Mock 데이터입니다. 실제 센서와 문 제어 장치는 연결되지 않았습니다.';
  $('public-end-button').classList.toggle('hidden',mode!=='public'||adminDetailView);
  $('public-lock-button').classList.toggle('hidden',mode!=='public'||adminDetailView);
  $('door-button').disabled=true;
}
function renderAdminCabinets(){
  const grid=$('admin-cabinet-grid');
  if(!grid)return;
  grid.innerHTML=demo.map(c=>`<button type="button" class="admin-cabinet-btn" onclick="openAdminCabinet(${c.id})">
    <span><strong>${c.id}번 신발장</strong><small>${stateLabel(c)} · 습도 ${c.humidity}% · 예상 ${dryingEstimate(c).text}</small></span>
    <span aria-hidden="true">›</span>
  </button>`).join('');
}
function openAdminCabinet(id){
  if(currentPage!=='admin')return;
  if(!demo.some(c=>c.id===id))return;
  selected=id;
  adminDetailView=true;
  navigate('detail');
}
function toggleAdminHistory(){
  if(currentPage!=='admin') return;
  const panel=$('admin-history-panel'), button=$('admin-history-toggle');
  const show=panel.classList.contains('hidden');
  panel.classList.toggle('hidden',!show);
  button.setAttribute('aria-expanded',String(show));
  button.textContent=show?'이용 기록 접기':'이용 기록 보기';
}
function mockOpenDoor(){showToast('🚪 아직 문 제어 장치가 연결되지 않았어요.')}
function saveMode(){showToast('관리자 인증 및 모드 변경 기능은 준비 중입니다.')}
let adminReturnPage='home';
function openPrototypeAdmin(){showToast('관리자 인증 기능은 준비 중입니다.')}
function backFromAdmin(){
  if(mode==='public')navigate('public-start');
  else navigate(adminReturnPage==='admin'?'settings':adminReturnPage);
}
function toggleNoQrChoices(){
  if(mode!=='public')return;
  const choices=$('no-qr-choices'),show=choices.classList.contains('hidden');
  choices.classList.toggle('hidden',!show);
  $('no-qr-button').setAttribute('aria-expanded',String(show));
}
function previewPublicStart(){showToast('공공장소 모드는 준비 중입니다.')}
function renderPublicSlots(){
  $('public-slot-grid').innerHTML=[1,2].map(id=>{
    const busy=!!prototypeSessions[id];
    return `<button type="button" class="public-slot ${publicSelected===id?'chosen':''}" onclick="selectPublicSlot(${id})" aria-pressed="${publicSelected===id}"><span class="public-slot-icon">▦</span><strong>${id}번 칸</strong><span class="badge ${busy?'red':'green'}">${busy?'이용 중':'이용 가능'}</span></button>`;
  }).join('');
}
function selectPublicSlot(id){publicSelected=id;renderPublicSlots()}
function continuePublicSlot(){navigate('public-password')}
function renderPublicPassword(){
  const busy=!!prototypeSessions[publicSelected];
  $('public-auth-title').textContent=`${publicSelected}번 칸 ${busy?'비밀번호 입력':'비밀번호 설정'}`;
  $('public-auth-description').textContent=busy?'이용을 시작할 때 설정한 비밀번호를 입력해주세요.':'이 칸을 이용할 비밀번호를 새로 설정해주세요.';
  $('public-confirm-row').classList.toggle('hidden',busy);
  $('public-auth-button').textContent=busy?'인증하고 들어가기':'이용 시작하기';
  $('public-password').value='';$('public-password-confirm').value='';
  $('public-password-message').textContent='';
  $('public-password').focus();
}
function submitPublicPassword(event){event.preventDefault();showToast('공공장소 인증은 준비 중입니다.')}
function lockPublicSession(){navigate('home')}
function endPublicSession(){showToast('보관 세션 기능은 준비 중입니다.')}
function previewCabinet(id){
  if(currentPage==='admin'){openAdminCabinet(id);return;}
  if(mode==='public'){publicSelected=id;publicUnlocked=null;navigate('public-password');return}
  const u=new URL(location.href);u.searchParams.set('cabinet',String(id));location.href=u.href;
}
document.querySelectorAll('input[name="mode"]').forEach(r=>r.addEventListener('change',()=>{
  document.querySelectorAll('.setting-card').forEach(x=>x.classList.remove('selected'));
  $(r.value==='home'?'home-choice':'public-choice').classList.add('selected');
}));
async function copyQrLinks(){
  const u=new URL(location.href);u.search='';u.hash='';const content=u.href;
  try{await navigator.clipboard.writeText(content);showToast('공통 QR 주소가 복사됐어요.')}catch(e){showToast('복사가 제한돼요. 현재 페이지 주소를 복사해 주세요.')}
}
async function refreshState(initial=false){
  try{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),8000);
    let responses;
    try{responses=await Promise.all(['/api/cabinets/1','/api/compartments'].map(async url=>{
      const response=await fetch(url,{cache:'no-store',signal:controller.signal});
      const body=await response.json();
      if(!response.ok||!body.success)throw new Error('서버 응답 오류');
      return body.data;
    }));}finally{clearTimeout(timeout)}
    const [cabinet,states]=responses;
    mode=cabinet.mode==='PUBLIC'?'public':'home';
    demo=states.map(c=>({id:c.compartment_id,occupied:c.shoe_status==='OCCUPIED',drying:c.drying_status==='DRYING',temp:c.temperature,humidity:c.humidity}));
    render();
    $('server-status').textContent='서버 연결됨 · Mock 센서 데이터 (실제 측정값 아님)';
    if(initial){
      if(qrCabinet){selected=qrCabinet;renderQrLanding();navigate('qr')}
      else navigate('home');
    }else if(currentPage==='detail')renderDetail();
  }catch(error){
    $('server-status').textContent='서버 연결 실패 · 상태를 불러오지 못했어요. 잠시 후 다시 시도합니다.';
    demo=[];render();
    if(currentPage==='detail'){navigate('home');showToast('상태 조회 실패: 서버 연결을 확인해주세요.')}
  }
}
refreshState(true);
setInterval(()=>{if(!document.hidden)refreshState()},5000);
