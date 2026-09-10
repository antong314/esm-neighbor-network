/* In-page editor for the Neighbor Network.
   Click "Edit this page", change text in place, Save. Saves go to the edit service (data-edit-api on <body>),
   which commits pages/<page>.html to the GitHub repository; GitHub Pages republishes within about a minute. */
(function(){
  var body=document.body, main=document.getElementById('main');
  var API=body.getAttribute('data-edit-api')||'', REPO=body.getAttribute('data-repo')||'', PAGE=body.getAttribute('data-page')||'index';
  if(!main) return;
  var original=null, editing=false;

  function el(tag,attrs,children){var e=document.createElement(tag);if(attrs)for(var k in attrs){if(k==='html')e.innerHTML=attrs[k];else if(k==='text')e.textContent=attrs[k];else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),attrs[k]);else e.setAttribute(k,attrs[k]);} (children||[]).forEach(function(c){e.appendChild(typeof c==='string'?document.createTextNode(c):c)});return e;}

  /* floating button */
  var fab=el('button',{class:'esm-fab',type:'button',title:'Edit this page',onclick:startEdit,html:'<span class="esm-fab-ico">&#9998;</span> Edit this page'});
  document.body.appendChild(fab);

  /* toolbar */
  var msg=el('div',{class:'esm-msg'});
  var nameInput=el('input',{class:'esm-name',type:'text',placeholder:'Your name (optional)',maxlength:'60','aria-label':'Your name'});
  try{nameInput.value=localStorage.getItem('esm-editor-name')||'';}catch(e){}
  function tb(label,title,fn,cls){return el('button',{type:'button',class:'esm-tb '+(cls||''),title:title,onmousedown:function(e){e.preventDefault();},onclick:fn,html:label});}
  function cmd(c,v){return function(){document.execCommand(c,false,v||null);main.focus();};}
  var toolbar=el('div',{class:'esm-toolbar',role:'toolbar','aria-label':'Editing tools'},[
    el('div',{class:'esm-tb-group'},[
      tb('<b>B</b>','Bold',cmd('bold')), tb('<i>I</i>','Italic',cmd('italic')),
      tb('H2','Section heading',cmd('formatBlock','<h2>')), tb('H3','Sub-heading',cmd('formatBlock','<h3>')), tb('¶','Normal paragraph',cmd('formatBlock','<p>')),
      tb('&bull; List','Bulleted list',cmd('insertUnorderedList')), tb('1. List','Numbered list',cmd('insertOrderedList')),
      tb('&#128279; Link','Add a link to the selected text',addLink), tb('Unlink','Remove link',cmd('unlink')),
      tb('&#8634;','Undo',cmd('undo')), tb('&#8635;','Redo',cmd('redo')), tb('Clear','Remove formatting',cmd('removeFormat'))
    ]),
    el('div',{class:'esm-tb-group esm-tb-right'},[
      nameInput,
      tb('History','See and restore earlier versions of this page',showHistory,'esm-secondary'),
      tb('Cancel','Discard changes',cancelEdit,'esm-secondary'),
      tb('Save','Publish your changes',save,'esm-primary')
    ]),
    msg
  ]);
  var hint=el('div',{class:'esm-hint',html:'You are editing this page. Click any text to change it; select text and use the toolbar for bold, links and lists. Nothing is published until you press <b>Save</b>.'});

  function startEdit(){
    if(editing) return;
    if(!API){alert('Editing is not connected yet: the save service address is missing from site.config.json.');return;}
    editing=true; original=main.innerHTML;
    document.body.insertBefore(toolbar,document.body.firstChild);
    document.body.insertBefore(hint,toolbar.nextSibling);
    body.classList.add('esm-editing');
    main.setAttribute('contenteditable','true'); main.setAttribute('spellcheck','true');
    main.addEventListener('click',blockLinks,true);
    window.addEventListener('beforeunload',warn);
    fab.style.display='none';
    setMsg('');
  }
  function stopEdit(){
    editing=false;
    main.removeAttribute('contenteditable'); main.removeAttribute('spellcheck');
    main.removeEventListener('click',blockLinks,true);
    window.removeEventListener('beforeunload',warn);
    body.classList.remove('esm-editing');
    if(toolbar.parentNode) toolbar.parentNode.removeChild(toolbar);
    if(hint.parentNode) hint.parentNode.removeChild(hint);
    closeHistory();
    fab.style.display='';
  }
  function cancelEdit(){
    if(main.innerHTML!==original && !confirm('Discard your changes?')) return;
    main.innerHTML=original; stopEdit();
  }
  function warn(e){ if(main.innerHTML!==original){e.preventDefault();e.returnValue='';} }
  function blockLinks(e){ var a=e.target.closest&&e.target.closest('a'); if(a && main.contains(a)){ e.preventDefault(); } }
  function addLink(){
    var sel=window.getSelection(); if(!sel||sel.isCollapsed){alert('First select the text you want to turn into a link.');return;}
    var url=prompt('Link address (https://…)','https://'); if(!url||url==='https://') return;
    document.execCommand('createLink',false,url);
    var a=sel.anchorNode&&sel.anchorNode.parentElement&&sel.anchorNode.parentElement.closest('a'); if(a&&/^https?:/.test(url)&&!/^https?:\/\/[^/]*(esm-neighbor|localhost)/.test(url)){a.setAttribute('target','_blank');a.setAttribute('rel','noopener');}
  }
  function setMsg(t,kind){ msg.textContent=t||''; msg.className='esm-msg'+(kind?' esm-msg-'+kind:''); }

  function cleanHtml(html){
    var box=document.createElement('div'); box.innerHTML=html;
    box.querySelectorAll('[contenteditable],[spellcheck]').forEach(function(e){e.removeAttribute('contenteditable');e.removeAttribute('spellcheck');});
    box.querySelectorAll('.esm-toolbar,.esm-hint,.esm-fab,.esm-history,script').forEach(function(e){e.remove();});
    return box.innerHTML.trim()+'\n';
  }

  function save(){
    var name=(nameInput.value||'').trim(); try{localStorage.setItem('esm-editor-name',name);}catch(e){}
    var html=cleanHtml(main.innerHTML);
    if(cleanHtml(original)===html){setMsg('No changes to save.','warn');return;}
    setMsg('Saving…'); toolbar.classList.add('esm-busy');
    fetch(API.replace(/\/$/,'')+'/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({page:PAGE,html:html,name:name})})
      .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j};});})
      .then(function(res){
        toolbar.classList.remove('esm-busy');
        if(!res.ok||!res.j.ok){setMsg('Could not save: '+(res.j.error||'unknown error'),'err');return;}
        original=main.innerHTML; stopEdit();
        showToast('Saved, thank you'+(name?', '+name:'')+'! Your change will be live for everyone in about a minute.');
      })
      .catch(function(e){toolbar.classList.remove('esm-busy');setMsg('Could not save: '+e.message,'err');});
  }

  var toast;
  function showToast(t){ if(toast)toast.remove(); toast=el('div',{class:'esm-toast',text:t}); document.body.appendChild(toast); setTimeout(function(){toast&&toast.remove();toast=null;},9000); }

  /* history */
  var panel=null;
  function closeHistory(){ if(panel){panel.remove();panel=null;} }
  function showHistory(){
    closeHistory();
    panel=el('div',{class:'esm-history'},[el('div',{class:'esm-history-head'},[el('strong',{text:'Earlier versions of this page'}),tb('&times;','Close',closeHistory,'esm-secondary')]),el('div',{class:'esm-history-list',text:'Loading…'})]);
    document.body.appendChild(panel);
    var list=panel.querySelector('.esm-history-list');
    fetch('https://api.github.com/repos/'+REPO+'/commits?path=pages/'+PAGE+'.html&per_page=20')
      .then(function(r){return r.json();})
      .then(function(commits){
        list.innerHTML='';
        if(!Array.isArray(commits)||!commits.length){list.textContent='No history found.';return;}
        commits.forEach(function(c,i){
          var d=new Date(c.commit.author.date); var m=(c.commit.message||'').split('\n')[0];
          var row=el('div',{class:'esm-history-row'},[
            el('div',{},[el('div',{class:'esm-history-msg',text:m}),el('div',{class:'esm-history-date',text:d.toLocaleString()})]),
            i===0?el('span',{class:'esm-current',text:'Current'}):tb('Restore','Restore this version',function(){restore(c.sha,m);},'esm-secondary')
          ]);
          list.appendChild(row);
        });
      }).catch(function(){list.textContent='Could not load history.';});
  }
  function restore(sha,label){
    if(!confirm('Restore the version "'+label+'"? The current version stays in the history.')) return;
    var name=(nameInput.value||'').trim();
    setMsg('Restoring…');
    fetch(API.replace(/\/$/,'')+'/restore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({page:PAGE,sha:sha,name:name})})
      .then(function(r){return r.json();})
      .then(function(j){ if(!j.ok){setMsg('Could not restore: '+(j.error||'unknown error'),'err');return;} stopEdit(); showToast('Restored. The page will update for everyone in about a minute; reload in a bit to see it.'); })
      .catch(function(e){setMsg('Could not restore: '+e.message,'err');});
  }
})();
