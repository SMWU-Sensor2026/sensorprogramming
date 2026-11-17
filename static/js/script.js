// 상태와 권한은 Flask 서버가 검증합니다. 브라우저에는 비밀번호를 저장하지 않습니다.
let demo=[], mode='home', selected=1, publicSelected=1, publicUnlocked=null;
let currentPage='home', adminDetailView=false, adminReturnPage='home', toastTimer;
let adminToken=null, refreshBusy=false, renderedMode=null;
let userAccess=null;
try { userAccess=JSON.parse(sessionStorage.getItem('bbosong_access')||'null'); } catch { /* 재인증 가능 */ }
const params=new URLSearchParams(location.search);
const qrParam=params.get('cabinet');
const qrCabinet=['1','2'].includes(qrParam)?Number(qrParam):null;
const $=id=>document.getElementById(id);

function showToast(message){
  $('toast').textContent=message;$('toast').classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3000);
}
async function api(path,{method='GET',data,token}={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{
    const response=await fetch('/api'+path,{
      method,cache:'no-store',signal:controller.signal,
      headers:{...(data?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},
      body:data?JSON.stringify(data):undefined
    });
    const result=await response.json();
    if(!response.ok||!result.success){
      const error=new Error(result.error?.message||'서버 요청에 실패했습니다.');
      error.code=result.error?.code;error.status=response.status;throw error;
    }
    return result.data;
  }catch(error){
    if(error.name==='AbortError')throw new Error('서버 응답 시간이 초과됐어요. 다시 시도해주세요.');
    throw error;
  }finally{clearTimeout(timer)}
}
function storeAccess(access){
  userAccess=access;
  if(access)sessionStorage.setItem('bbosong_access',JSON.stringify(access));
  else sessionStorage.removeItem('bbosong_access');
}
function adapt(c){return {...c,id:c.compartment_id,occupied:c.shoe_status==='OCCUPIED',drying:c.drying_status==='DRYING',temp:c.temperature}}
function stateLabel(c){return c.shoe_status==='UNKNOWN'?'감지 불확실':!c.occupied?'비어 있음':c.drying?'건조 중':'보관 중'}
function dryingEstimate(c){return c.occupied?'데이터 수집 중':'—'}
function navigate(page){
  if(page==='admin'&&!adminToken){openPrototypeAdmin();return;}
  if(page==='history'){showToast('기록은 관리자 페이지에서 확인할 수 있어요.');return;}
  if(mode==='public'&&!['admin','public-start','public-password','detail'].includes(page))page='public-start';
  if(mode==='public'&&page==='detail'&&!adminDetailView&&publicUnlocked!==selected)page='public-start';
  if(!['detail','admin'].includes(page))adminDetailView=false;
  currentPage=page;
  document.body.classList.toggle('qr-entry-active',['qr','public-start','public-password'].includes(page));
  document.body.classList.toggle('public-user-active',mode==='public'&&page!=='admin'&&!adminDetailView);
  document.body.classList.toggle('admin-detail-active',page==='detail'&&adminDetailView);
  document.querySelectorAll('.page').forEach(el=>el.classList.toggle('active',el.id==='page-'+page));
  document.querySelectorAll('.nav-btn').forEach(el=>el.classList.toggle('active',el.dataset.nav===(page==='detail'?'cabinets':page==='admin'?'settings':page)));
  if(page==='detail')renderDetail();
  if(page==='public-password')renderPublicPassword();
  if(page==='public-start')renderPublicSlots();
  window.scrollTo({top:0,behavior:'instant'});
}
function render(){
  $('home-mode-label').textContent=mode==='home'?'가정용 모드':'공공장소용 모드';
  $('current-mode-badge').textContent=mode==='home'?'가정용':'공공장소용';
  $('mode-description').textContent=mode==='home'?'로그인 없이 상태를 확인할 수 있어요.':'비밀번호로 해당 칸만 이용할 수 있어요.';
  $('home-grid').innerHTML=mode==='home'?demo.map(c=>`<button class="cabinet-card" onclick="openCabinet(${c.id})"><div class="row"><strong>${c.id}번 칸</strong><span class="badge ${c.occupied?'red':'green'}">${c.occupied?'사용 중':'빈 칸'}</span></div><div class="art">${c.occupied?'👟':'🧺'}</div><div class="state">${stateLabel(c)} · 습도 ${c.humidity??'—'}%</div><span class="estimate-line">◷ 예상 건조시간: ${dryingEstimate(c)}</span></button>`).join(''):'';
  $('cabinet-list').innerHTML=mode==='home'?demo.map(c=>`<button class="list-item" onclick="openCabinet(${c.id})"><div><strong>${c.id}번 신발장</strong><p>${stateLabel(c)} · ${c.humidity??'—'}% RH</p></div><span class="chev">›</span></button>`).join(''):'';
  $('cabinet-list-note').textContent=mode==='home'?'가정용: 두 칸의 상태를 확인할 수 있어요.':'';
  $('qr-home-link').classList.toggle('hidden',mode==='public');
  $('qr-admin-link').classList.toggle('hidden',mode!=='public');
  if(currentPage!=='admin'||renderedMode!==mode){
    document.querySelectorAll('input[name="mode"]').forEach(input=>{input.checked=input.value===mode;});
    document.querySelectorAll('.setting-card').forEach(el=>el.classList.toggle('selected',el.id===mode+'-choice'));
  }
  renderedMode=mode;
  renderPublicSlots();renderAdminCabinets();
}
async function openCabinet(id){
  try{
    const c=await api('/compartments/'+id,{token:mode==='public'?userAccess?.access_token:null});
    demo=demo.filter(x=>x.id!==id).concat(adapt(c));selected=id;adminDetailView=false;
    if(mode==='public')publicUnlocked=id;
    navigate('detail');
  }catch(error){showToast(error.message)}
}
function backFromDetail(){if(adminDetailView){adminDetailView=false;navigate('admin')}else if(mode==='public')lockPublicSession();else navigate('cabinets')}
function renderQrLanding(){selected=qrCabinet||1;$('qr-cabinet-title').textContent=selected+'번';$('qr-selected-cabinet').textContent=String(selected).padStart(2,'0')+'번 칸'}
function enterQrCabinet(){mode==='public'?navigate('public-start'):openCabinet(selected)}
function renderDetail(){
  const c=demo.find(c=>c.id===selected);if(!c)return;
  $('detail-title').textContent=c.id+'번 신발장';$('detail-badge').textContent=stateLabel(c);
  $('detail-badge').className='badge '+(c.occupied?'red':'green');
  $('detail-icon').textContent=c.occupied?'👟':'🧺';$('detail-status').textContent=stateLabel(c);
  $('detail-desc').textContent='문 상태: '+(c.door_status||'—');
  $('detail-temp').textContent=Number.isFinite(c.temp)?c.temp.toFixed(1)+'°C':'—';
  $('detail-humidity').textContent=(c.humidity??'—')+'%';$('detail-fan').textContent=c.fan_status||'—';
  $('detail-shoes').textContent=c.shoe_status==='UNKNOWN'?'불확실':c.occupied?'있음':'없음';
  $('detail-estimate').textContent=dryingEstimate(c);$('detail-estimate-note').textContent='건조 이력이 부족해 예상 시간을 제공할 수 없습니다.';
  $('detail-back').textContent=adminDetailView?'← 관리자 페이지':mode==='public'?'← 칸 선택':'← 신발장 목록';
  $('detail-access-note').textContent='Mock 센서 데이터입니다. 실제 문은 움직이지 않습니다.'+(userAccess?.session?.session_status==='RESERVED'?' 예약 완료 · 입고 확인 대기 중입니다.':'');
  const userPublic=mode==='public'&&!adminDetailView;
  $('public-end-button').classList.toggle('hidden',!userPublic);
  $('public-end-button').textContent=userAccess?.session?.session_status==='RESERVED'?'입고 전 예약 취소':'출고 요청';
  $('public-lock-button').classList.toggle('hidden',!userPublic);
  $('door-button').disabled=true;
}
function renderPublicSlots(){
  const labels={AVAILABLE:'이용 가능',RESERVED:'예약 중',IN_USE:'이용 중',UNAVAILABLE:'이용 불가'};
  $('public-slot-grid').innerHTML=demo.map(c=>`<button type="button" class="public-slot ${publicSelected===c.id?'chosen':''}" onclick="selectPublicSlot(${c.id})" aria-pressed="${publicSelected===c.id}"><span class="public-slot-icon">▦</span><strong>${c.id}번 칸</strong><span class="badge ${c.availability==='AVAILABLE'?'green':'red'}">${labels[c.availability]||'확인 중'}</span></button>`).join('');
}
function selectPublicSlot(id){publicSelected=id;renderPublicSlots()}
function continuePublicSlot(){
  const c=demo.find(c=>c.id===publicSelected);
  if(!c||c.availability==='UNAVAILABLE'){showToast('현재 이용할 수 없는 칸입니다.');return;}
  navigate('public-password');
}
function renderPublicPassword(){
  const busy=demo.find(c=>c.id===publicSelected)?.availability!=='AVAILABLE';
  $('public-auth-title').textContent=`${publicSelected}번 칸 비밀번호 ${busy?'입력':'설정'}`;
  $('public-auth-description').textContent=busy?'보관할 때 설정한 비밀번호를 입력해주세요.':'이용할 비밀번호를 설정해주세요.';
  $('public-confirm-row').classList.toggle('hidden',busy);
  $('public-auth-button').textContent=busy?'인증하고 들어가기':'예약하기';
  $('public-password').value='';$('public-password-confirm').value='';$('public-password-message').textContent='';
}
async function submitPublicPassword(event){
  event.preventDefault();const button=$('public-auth-button');if(button.disabled)return;
  const password=$('public-password').value;
  const busy=demo.find(c=>c.id===publicSelected)?.availability!=='AVAILABLE';
  if(!busy&&password!==$('public-password-confirm').value){$('public-password-message').textContent='비밀번호 확인이 일치하지 않습니다.';return;}
  button.disabled=true;
  try{
    const access=await api(busy?'/storage-sessions/authenticate':'/storage-sessions',{method:'POST',data:{compartment_id:publicSelected,password}});
    storeAccess(access);selected=publicSelected;publicUnlocked=selected;
    await openCabinet(selected);
  }catch(error){$('public-password-message').textContent=error.message;showToast(error.message)}
  finally{button.disabled=false;$('public-password').value='';$('public-password-confirm').value='';}
}
function lockPublicSession(){publicUnlocked=null;navigate('public-start')}
async function endPublicSession(){
  if(!userAccess)return;
  const button=$('public-end-button');button.disabled=true;
  try{
    const session=await api('/storage-sessions/me',{token:userAccess.access_token});
    const action=session.session_status==='RESERVED'?'cancel':'checkout';
    await api(`/storage-sessions/${session.session_id}/${action}`,{method:'POST',token:userAccess.access_token});
    if(action==='cancel'){storeAccess(null);publicUnlocked=null;navigate('public-start');showToast('예약을 취소했어요.');}
    else showToast('출고 요청 완료 · 문 열림과 신발 반출 확인을 기다립니다.');
    await refreshState();
  }catch(error){showToast(error.message)}finally{button.disabled=false}
}
function openPrototypeAdmin(){adminReturnPage=currentPage;$('admin-login-message').textContent='';$('admin-login').showModal();$('admin-password').focus()}
async function loginAdmin(event){
  event.preventDefault();const button=$('admin-login-submit');button.disabled=true;
  try{
    const result=await api('/admin/login',{method:'POST',data:{password:$('admin-password').value}});
    adminToken=result.access_token;$('admin-login').close();await refreshState();navigate('admin');
  }catch(error){$('admin-login-message').textContent=error.message}finally{$('admin-password').value='';button.disabled=false}
}
async function logoutAdmin(){
  try{await api('/admin/logout',{method:'POST',token:adminToken})}catch(error){showToast(error.message)}
  adminToken=null;adminDetailView=false;navigate(mode==='public'?'public-start':'home');await refreshState();
}
function backFromAdmin(){adminDetailView=false;navigate(mode==='public'?'public-start':'home')}
async function saveMode(){
  const target=document.querySelector('input[name="mode"]:checked');if(!target)return;
  try{
    await api('/admin/cabinet/mode',{method:'PATCH',data:{mode:target.value.toUpperCase()},token:adminToken});
    storeAccess(null);publicUnlocked=null;await refreshState();showToast('운영 모드를 저장했어요.');
  }catch(error){showToast(error.message)}
}
function renderAdminCabinets(){
  $('admin-cabinet-grid').innerHTML=adminToken?demo.map(c=>`<div class="card mt-14"><button class="admin-cabinet-btn" onclick="openAdminCabinet(${c.id})"><strong>${c.id}번 칸 · ${c.shoe_status||'—'} · ${c.door_status||'—'}</strong><span>›</span></button><p class="tiny-note">Mock 센서 입력 (실제 장치 제어 아님)</p><div class="row"><button onclick="mockObserve(${c.id},'OCCUPIED')">입고 감지</button><button onclick="mockObserve(${c.id},null,'OPEN')">문 열림 확인</button><button onclick="mockObserve(${c.id},'EMPTY')">반출 감지</button><button onclick="mockObserve(${c.id},null,'CLOSED')">문 닫힘</button><button onclick="mockObserve(${c.id},null,'ERROR')">문 오류</button></div></div>`).join(''):'';
}
function openAdminCabinet(id){if(!adminToken)return;selected=id;adminDetailView=true;navigate('detail')}
async function mockObserve(id,shoe,door){
  try{await api('/admin/mock/compartments/'+id,{method:'POST',data:{...(shoe?{shoe_status:shoe}:{}),...(door?{door_status:door}:{})},token:adminToken});await refreshState();showToast('Mock 센서 상태를 반영했어요.');}catch(error){showToast(error.message)}
}
async function toggleAdminHistory(){
  const panel=$('admin-history-panel');panel.classList.toggle('hidden');
  $('admin-history-toggle').setAttribute('aria-expanded',String(!panel.classList.contains('hidden')));
  if(panel.classList.contains('hidden'))return;
  try{
    const events=await api('/admin/events',{token:adminToken});$('history-content').replaceChildren();
    if(!events.length)$('history-content').textContent='아직 이용 기록이 없어요.';
    for(const event of events){const p=document.createElement('p');p.textContent=`${event.occurred_at} · ${event.compartment_id}번 칸 · ${event.event_type}`;$('history-content').append(p);}
  }catch(error){$('history-content').textContent=error.message}
}
function toggleNoQrChoices(){const el=$('no-qr-choices');el.classList.toggle('hidden');$('no-qr-button').setAttribute('aria-expanded',String(!el.classList.contains('hidden')))}
function previewPublicStart(){if(mode!=='public'){showToast('먼저 공공장소용 모드로 변경해주세요.');return;}navigate('public-start')}
function previewCabinet(id){currentPage==='admin'?openAdminCabinet(id):openCabinet(id)}
function mockOpenDoor(){showToast('실제 문 제어 장치는 연결되지 않았어요.')}
async function copyQrLinks(){try{await navigator.clipboard.writeText(location.origin+'/');showToast('공통 QR 주소가 복사됐어요.')}catch{$('qr-address').textContent=location.origin+'/';showToast('표시된 주소를 복사해주세요.')}}
async function refreshState(initial=false){
  if(refreshBusy)return;refreshBusy=true;
  try{
    const cabinet=await api('/cabinets/1');
    const nextMode=cabinet.mode==='PUBLIC'?'public':'home';
    if(nextMode!==mode){publicUnlocked=null;adminDetailView=false;if(!initial&&currentPage!=='admin')navigate(nextMode==='public'?'public-start':'home');}
    mode=nextMode;
    let states=await api('/compartments');
    if(adminToken){
      try{states=await api('/admin/compartments',{token:adminToken})}
      catch(error){if(error.status===401||error.status===403){adminToken=null;adminDetailView=false;if(currentPage==='admin'||currentPage==='detail')navigate(mode==='public'?'public-start':'home');}else throw error;}
    }
    demo=states.map(adapt);
    if(mode==='public'&&userAccess){
      try{
        const session=await api('/storage-sessions/me',{token:userAccess.access_token});
        storeAccess({...userAccess,session});
        if(currentPage==='detail'&&!adminDetailView){
          const c=await api('/compartments/'+selected,{token:userAccess.access_token});demo=demo.filter(x=>x.id!==selected).concat(adapt(c));
        }
      }catch(error){
        if(error.status===401||error.status===403){storeAccess(null);publicUnlocked=null;if(currentPage==='detail'&&!adminDetailView){navigate('public-start');showToast('접근 권한이 종료됐어요. 필요하면 비밀번호로 다시 인증해주세요.');}}
        else throw error;
      }
    }
    render();$('server-status').textContent='서버 연결됨 · Mock 센서 데이터';
    $('public-server-status').textContent='서버 연결됨 · 센서 시연 모드';
    if(initial){if(mode==='public')navigate('public-start');else if(qrCabinet){renderQrLanding();navigate('qr')}else navigate('home');}
    else if(currentPage==='detail')renderDetail();
  }catch(error){
    const message='서버 연결 실패 · 상태를 불러오지 못했어요. 잠시 후 재시도합니다.';
    $('server-status').textContent=message;$('public-server-status').textContent=message;
    if(currentPage==='detail'){adminDetailView=false;navigate(mode==='public'?'public-start':'home');}
    demo=[];render();showToast(error.message);
  }finally{refreshBusy=false}
}
document.querySelectorAll('input[name="mode"]').forEach(input=>input.addEventListener('change',()=>{
  document.querySelectorAll('.setting-card').forEach(el=>el.classList.toggle('selected',el.id===input.value+'-choice'));
}));
refreshState(true);
setInterval(()=>{if(!document.hidden)refreshState()},5000);
