let socket = io({
  transports: ['websocket', 'xhr']
}); 
let secSocket = io.connect('/secure');
let status = 0; 

function showStatus(type, msg){
  let map = {
    'error': ['fa-exclamation-triangle', 'st-red'], 
    'pending': ['fa-circle-notch fa-spin', 'st-yellow'], 
    'success': ['fa-lock', 'st-green']
  }
  $('#status').html(`<i class='fas ${map[type][0]}'></i> ${msg}`); 
}

socket.on('connect', () => {
  logger.info('[std] socket connected; id: '+socket.id)
  showStatus('success', 'Connected'); 
  if(!status){
    logger.info('first connection, attempting to elevate')
    socket.emit('sec-login'); 
    showStatus('pending', 'Authenticating...'); 
  }
});

let firstConnect = true; 
secSocket.on('connect', () => {
  logger.info('[sec] socket connected; id: '+socket.id); 
  ping(); 
  if(firstConnect){
    firstConnect = false; 
    secSocket.emit('get-questionList');
  }
})

secSocket.on('connect_error', (err) => {
  logger.info('[sec] connection error: '+err)
})

secSocket.on('error', (err) => {
  logger.info('[sec] error: '+err)
})

socket.on('disconnect', (reason) => {
  logger.info('socket disconnected: '+reason); 
  $('#s-ping-outer').hide(); 
  if(reason === 'io server disconnect'){
    showStatus('error', 'Kicked by Server'); 
    alert('Disconnected by server. ')
  } else {
    showStatus('pending', 'Reconnecting...'); 
  }
})

socket.on('status', (res) => {
  if(res.valid){
    showStatus('success', 'Connected'); 
    logger.info('elevation successful')
  }
  else{
    showStatus('error', 'Not Authenticated'); 
    logger.warn('login rejected; redirecting');
    setTimeout(() => {
      window.open('..', '_self')
    }, 1000); 
  }
}); 

let ping_ds = 0; 
function ping() {
  if (socket && socket.connected) {
    ping_ds = Date.now(); 
    socket.volatile.emit('tn-ping'); 
  }
}
socket.on('pong', () => {
  $('#s-ping-outer').show(); 
  $('#s-ping').text(Date.now() - ping_ds); 
})
setInterval(ping, 4000); 

socket.on('timer', (t) => {
  $('.field-timer').text(`${t} second${t===1?'':'s'} remaining.`); 
})

// actual host stuff

secSocket.on('update', (msg) => {
  if(typeof msg === 'object') msg = JSON.stringify(msg);  
  logger.info('[server]' + msg); 
  alert(msg); 
})

secSocket.on('question-full', (q) => {
  logger.info('[sec] got question: '+JSON.stringify(q)); 
  $('.field-timer').text(`No timer active.`); 
  $('#q-cur-det').text(`R${q.round}Q${q.num} • ${q.type.toUpperCase()} • ${q.category}`);
  $('#q-cur').html(q.question + (q.type==='mc'?`<br/><i> - ${q.options.join('</i><br/><i> - ')}</i>`:'')); 
  $('#q-ans').text(0); 
  $('#q-cor').text(0);
  $('#q-ans-val').prop('title', `Answer: ${q.answer}`);
}); 

secSocket.on('question-list', (l) => {
  for(let i = 0; i < l.length; i++){
    $('#sel-questions')[0].insertAdjacentHTML('beforeEnd', `<option value='${i}'>R${l[i].r} Q${l[i].q}</option>`); 
  }
})

$('#btn-loadQuestion').on('click', () => {
  secSocket.emit('load-question', parseInt($('#sel-questions').val())); 
})

$('#btn-startTimer').on('click', () => {
  secSocket.emit('start-timer', $('#i-timer').val()); 
})

secSocket.on('ans-update', (dt) => {
  let total = Object.keys(dt).length; 
  let correct = Object.values(dt).filter(r => r==1).length; 
  $('#q-ans').text(total); 
  $('#q-cor').text(correct);
})

$('#nav-cat a').on('click', (e) => {
  let ele = e.srcElement; 
  $('#nav-cat a.active').removeClass('active'); 
  $(ele).addClass('active'); 
  $('.container').hide(); 
  $('#'+ele.dataset.target).css('display', 'flex'); 
})

function intervalUpdate() {
  $('#s-time').text(moment().format('M.DD // hh:mm:ss A'))
}
setInterval(() => intervalUpdate, 1000); 

window.onload = function() {
  intervalUpdate(); 
  if (location.hash && $(`#nav-cat a[href="${location.hash}"]`)) {
    $(`#nav-cat a[href="${location.hash}"]`).addClass('active'); 
    $(location.hash).css('display', 'flex'); 
  } else {
    window.open('#basic', '_self'); 
    $(`#nav-cat a[href="#basic"]`).addClass('active'); 
    $('#basic').css('display', 'flex'); 
  }
}