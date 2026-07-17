function makeInputWrapper(propPath, pathArray, masterVal, isTextarea) {
  var displayVal = getInstanceValue(propPath, masterVal);
  var isOverridden = activeInstance && activeInstance.overwrites && (propPath in activeInstance.overwrites);
  
  var wrapper = document.createElement('div');
  wrapper.className = 'input-wrapper' + (isOverridden ? ' overridden' : '');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = 'var(--space-1)';
  
  var inputHtml = isTextarea 
    ? '<textarea style="width:100%; min-height:80px; padding:var(--space-2); border-radius:var(--radius-sm); border:1.5px solid oklch(from var(--color-text) l c h / .15); background:var(--color-surface); color:var(--color-text); font-family:inherit; resize:vertical">' + esc(displayVal) + '</textarea>'
    : '<input value="' + esc(displayVal) + '" style="width:100%; padding:0 var(--space-2); height:32px; border-radius:var(--radius-sm); border:1.5px solid oklch(from var(--color-text) l c h / .15); background:var(--color-surface); color:var(--color-text); font-family:inherit">';
  
  var overrideControls = '';
  if (activeInstance) {
    var isEs = state.langFilter === 'es';
    var resetText = isEs ? 'Restablecer' : 'Reset';
    overrideControls = '<div class="override-status-bar" style="display:flex; justify-content:space-between; align-items:center; margin-top:var(--space-1); gap:var(--space-2)">'
      + '<span class="status-label" style="font-size:var(--text-xxs); font-weight:600; color:' + (isOverridden ? 'var(--color-primary)' : 'var(--color-text-muted)') + '">'
      + (isOverridden ? (isEs ? '🟢 Anulación adaptada' : '🟢 Tailored Override') : (isEs ? '⚪ Usando valor maestro' : '⚪ Using Master Value'))
      + '</span>'
      + '<div class="status-buttons" style="display:flex; gap:var(--space-1)">'
      + (isOverridden ? '<button class="btn btn-xs btn-ghost" data-reset>' + resetText + '</button>' : '')
      + '</div>'
      + '</div>';
  }
  
  wrapper.innerHTML = '<div class="kv" style="align-items: flex-start"><div class="mono" style="margin-top: 6px">value</div>' + inputHtml + '</div>' + overrideControls;
  
  var inputEl = wrapper.querySelector('input, textarea');
  inputEl.oninput = function(e) {
    var val = e.target.value;
    if (activeInstance) {
      var statusBar = wrapper.querySelector('.override-status-bar');
      if (statusBar) {
        var label = statusBar.querySelector('.status-label');
        var buttonsDiv = statusBar.querySelector('.status-buttons');
        
        var isEs = state.langFilter === 'es';
        label.textContent = isEs ? '🟢 Anulación adaptada (sin guardar)' : '🟢 Tailored Override (Unsaved)';
        label.style.color = 'var(--color-primary)';
        label.style.fontWeight = '700';
        
        var kv = wrapper.querySelector('.kv');
        if (kv) {
          kv.style.borderLeft = '3px solid var(--color-primary)';
          kv.style.paddingLeft = 'var(--space-2)';
        }
        
        if (!statusBar.querySelector('[data-apply]')) {
          var resetText = isEs ? 'Restablecer' : 'Reset';
          var saveText = isEs ? 'Guardar instancia' : 'Save instance';
          buttonsDiv.innerHTML = '<button class="btn btn-xs btn-primary" data-apply>' + saveText + '</button>'
            + '<button class="btn btn-xs btn-ghost" data-reset>' + resetText + '</button>';
            
          buttonsDiv.querySelector('[data-apply]').onclick = function() {
            setInstanceOverride(propPath, inputEl.value);
            renderAll();
          };
          buttonsDiv.querySelector('[data-reset]').onclick = function() {
            resetInstanceOverride(propPath);
          };
        }
      }
    } else {
      setPath(pathArray, val);
    }
  };
  
  if (isOverridden) {
    var resetBtn = wrapper.querySelector('[data-reset]');
    if (resetBtn) {
      resetBtn.onclick = function() {
        resetInstanceOverride(propPath);
      };
    }
  }
  
  return wrapper;
}

function initSections(){
  Object.keys(data).forEach(function(k){
    if(k==='_templates'||k==='templates'||k==='_hiddenFields'||k.indexOf('_')===0) return;
    if(!state.sections[k]) state.sections[k]={include:true,title:human(k)};
    initPropertyNames(k,data[k]);
    if(Array.isArray(data[k])) data[k].forEach(function(item){
      if(isObj(item)&&!('selected' in item)) item.selected=true;
    });
  });
  normalizeSkills();
}

function initPropertyNames(section,val,prefix){
  prefix=prefix||'';
  if(Array.isArray(val)){ val.forEach(function(item,i){ initPropertyNames(section,item,prefix?prefix+'.'+i:String(i)); }); return; }
  if(isObj(val)){
    Object.keys(val).forEach(function(key){
      var path=prefix?section+'.'+prefix+'.'+key:section+'.'+key;
      if(!(path in state.propertyNames)) state.propertyNames[path]=human(key);
      initPropertyNames(section,val[key],prefix?prefix+'.'+key:key);
    });
  }
}

function normalizeSkills(){
  if(!data.skills) return;
  Object.keys(data.skills).forEach(function(group){
    if(!Array.isArray(data.skills[group])) return;
    data.skills[group]=data.skills[group].map(function(item){
      if(typeof item==='string') return {name:item,selected:true};
      return ('selected' in item)?item:Object.assign({},item,{selected:true});
    });
  });
}

function countEntries(v){ return Array.isArray(v)?v.length:(isObj(v)?Object.keys(v).length:1); }

function renderSectionList(){
  var list=el('sectionList'); list.innerHTML='';
  var keys=Object.keys(data).filter(function(k){
    return k!=='_templates'&&k!=='templates'&&k!=='_hiddenFields'&&k.indexOf('_')!==0;
  });
  el('sectionCount').textContent=String(keys.length);
  var isEs = state.langFilter === 'es';
  if(!keys.length){ list.innerHTML='<div class="tiny muted">' + (isEs ? 'Importa un archivo JSON para comenzar.' : 'Upload a JSON file to begin.') + '</div>'; return; }
  keys.forEach(function(k){
    var btn=document.createElement('button');
    btn.className='navitem'+(state.activeSection===k?' active':'');
    btn.innerHTML='<span>'+human(k)+'</span><span class="count">'+countEntries(data[k])+'</span>';
    btn.onclick=function(){ state.activeSection=k; renderAll(); scrollOutlineTo(k); };
    list.appendChild(btn);
  });
}

function scrollOutlineTo(k){
  var box=el('outlineBox');
  box.querySelectorAll('.outline-link').forEach(function(a){ a.classList.remove('active-section'); });
  var link=box.querySelector('a[href="#sec-card-'+k+'"]');
  if(link){ link.classList.add('active-section'); link.scrollIntoView({block:'nearest',behavior:'smooth'}); }
}

function renderOutline(){
  var box=el('outlineBox'); box.innerHTML='';
  var keys = Object.keys(data).filter(function(k){
    return k!=='_templates'&&k!=='templates'&&k!=='_hiddenFields'&&k.indexOf('_')!==0;
  });
  var isEs = state.langFilter === 'es';
  if(!keys.length){ box.innerHTML='<div class="tiny muted" style="padding:var(--space-2)">' + (isEs ? 'No se han cargado datos.' : 'No data loaded.') + '</div>'; return; }
  keys.forEach(function(k){
    var v=data[k];
    var sec=document.createElement('div'); sec.className='outline-section';
    var secA=document.createElement('a');
    secA.href='#sec-card-'+k; secA.className='outline-link'+(state.activeSection===k?' active-section':'');
    secA.style.fontWeight='700'; secA.style.color='var(--color-primary)';
    secA.innerHTML='<span class="olabel">'+esc(human(k))+'</span>';
    sec.appendChild(secA);
    var lst=document.createElement('div'); lst.className='outline-list';
    if(Array.isArray(v)){
      v.forEach(function(item,i){
        var label='#'+(i+1);
        if(isObj(item)) label=item.title||item.degree||item.role||item.organization||item.institution||item.language||item.description||label;
        var a=document.createElement('a'); a.href='#'+slugId(k,i); a.className='outline-link';
        a.innerHTML='<span class="olabel">'+esc(label)+'</span><span class="otype">entry</span>';
        lst.appendChild(a);
      });
    } else if(isObj(v)&&k==='skills'){
      Object.keys(v).forEach(function(group){
        var a=document.createElement('a'); a.href='#skill-group-'+k+'-'+group; a.className='outline-link';
        a.innerHTML='<span class="olabel">'+esc(human(group))+'</span><span class="otype">group</span>';
        lst.appendChild(a);
      });
    } else if(isObj(v)){
      Object.keys(v).forEach(function(field){
        var a=document.createElement('a'); a.href='#field-'+k+'-'+field; a.className='outline-link';
        a.innerHTML='<span class="olabel">'+esc(state.propertyNames[k+'.'+field]||human(field))+'</span><span class="otype">field</span>';
        lst.appendChild(a);
      });
    }
    sec.appendChild(lst); box.appendChild(sec);
  });
  
  box.onclick = function(e) {
    var link = e.target.closest('.outline-link');
    if (!link) return;
    
    var href = link.getAttribute('href');
    if (!href || href.indexOf('#') !== 0) return;
    
    var targetId = href.substring(1);
    var section = '';
    
    if (targetId.indexOf('entry-') === 0) {
      var parts = targetId.split('-');
      section = parts[1];
    } else if (targetId.indexOf('sec-card-') === 0) {
      section = targetId.substring('sec-card-'.length);
    } else if (targetId.indexOf('field-') === 0) {
      var parts = targetId.split('-');
      section = parts[1];
    } else if (targetId.indexOf('skill-group-') === 0) {
      var parts = targetId.split('-');
      section = parts[2];
    }
    
    if (section && section !== state.activeSection) {
      state.activeSection = section;
      renderAll();
    }
    
    setTimeout(function() {
      var targetEl = el(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        targetEl.style.outline = '2px solid var(--color-primary)';
        targetEl.style.outlineOffset = '2px';
        setTimeout(function() {
          targetEl.style.outline = 'none';
        }, 1200);
      }
    }, 60);
    
    e.preventDefault();
  };
}

function propRenameRow(path,key){
  var isIncluded = true;
  if (activeInstance && activeInstance.visibility && activeInstance.visibility[path] !== undefined) {
    isIncluded = activeInstance.visibility[path];
  } else if (data._hiddenFields && data._hiddenFields[path] !== undefined) {
    isIncluded = !data._hiddenFields[path];
  }
  
  var val = getPathValue(path, data);
  if (activeInstance && activeInstance.overwrites && activeInstance.overwrites[path] !== undefined) {
    val = activeInstance.overwrites[path];
  }
  var isEmpty = !val || !String(val).trim();
  var warningIcon = (isIncluded && isEmpty) ? '<span class="warn-icon" title="Included but empty" style="color:var(--color-warning); cursor:help; font-size:var(--text-sm); line-height:1; margin-left:4px">⚠️</span>' : '';

  var labelVal = '';
  if (activeInstance && activeInstance.propertyNames && activeInstance.propertyNames[path] !== undefined) {
    labelVal = activeInstance.propertyNames[path];
  } else {
    labelVal = state.propertyNames[path] || human(key);
  }

  var isEs = state.langFilter === 'es';
  return '<div class="kv" style="align-items:center; gap:var(--space-2); margin-bottom: 4px">'
    + '<label class="pill" style="margin:0; font-size:var(--text-xxs); flex-shrink:0"><input type="checkbox" data-field-include="'+esc(path)+'" '+(isIncluded?'checked':'')+'> ' + (isEs ? 'Incluir' : 'Include') + '</label>'
    + '<div class="mono" style="flex-shrink:0; font-weight:bold; display:flex; align-items:center">'+esc(key)+warningIcon+'</div>'
    + '<input data-propname="'+esc(path)+'" value="' + esc(labelVal) + '" style="flex:1; height:24px; padding:2px 8px; font-size:var(--text-xs)">'
    + '</div>';
}

function bindPropRename(root){
  root.querySelectorAll('[data-propname]').forEach(function(inp){
    inp.oninput=function(e){
      var path = e.target.dataset.propname;
      var val = e.target.value;
      if (activeInstance) {
        if (!activeInstance.propertyNames) activeInstance.propertyNames = {};
        activeInstance.propertyNames[path] = val;
        saveCurrentInstance();
      } else {
        state.propertyNames[path] = val;
        markDirty();
      }
      renderOutline();
      renderLatex();
    };
  });
  root.querySelectorAll('[data-field-include]').forEach(function(chk){
    chk.onchange=function(e){
      var path = e.target.dataset.fieldInclude;
      var show = e.target.checked;
      if (activeInstance) {
        if (!activeInstance.visibility) activeInstance.visibility = {};
        activeInstance.visibility[path] = show;
        saveCurrentInstance();
      } else {
        if (!data._hiddenFields) data._hiddenFields = {};
        data._hiddenFields[path] = !show;
        markDirty();
      }
      renderLatex();
      renderHtmlPreview();
      renderSchema();
    };
  });
}

function renderEditor(){
  var host=el('editorTab'); host.innerHTML='';
  if(!state.activeSection){ host.innerHTML='<div class="card"><div class="cardbody tiny">' + (state.langFilter === 'es' ? 'Importa un archivo JSON para comenzar a editar.' : 'Upload a JSON file to begin editing.') + '</div></div>'; return; }
  var k=state.activeSection;
  var title=(state.sections[k]&&state.sections[k].title)||human(k);
  el('sectionTitleInput2').value=title;
  el('sectionTitleInput2').oninput=function(e){ state.sections[k].title=e.target.value; markDirty(); renderLatex(); renderEditor(); };
  var sec=document.createElement('div'); sec.className='card'; sec.id='sec-card-'+k;
  
  var isEs = state.langFilter === 'es';
  var deleteBtnHtml = k !== 'basics' ? '<button class="btn btn-danger btn-xs" id="deleteSectionBtn" style="min-height:28px; padding:2px 8px; font-size:var(--text-xs); margin-left:var(--space-2)">' + (isEs ? 'Eliminar sección' : 'Delete Section') + '</button>' : '';

  sec.innerHTML='<div class="cardhead"><div class="split"><div><strong>'+human(k)+'</strong><div class="tiny">' + (isEs ? 'Edita campos, selecciona entradas, renombre propiedades.' : 'Edit fields, select entries, rename properties.') + '</div></div>'
    +'<div style="display:flex; align-items:center; gap:var(--space-2)"><label class="pill"><input type="checkbox" '+(state.sections[k].include?'checked':'')+' id="includeSectionBox"> ' + (isEs ? 'Incluir' : 'Include') + '</label>'
    +deleteBtnHtml
    +'</div></div></div>'
    +'<div class="cardbody subgrid">'
    +'<div class="row2"><div><label class="tiny">' + (isEs ? 'Título de salida' : 'Output title') + '</label><input id="sectionTitleInput" value="'+esc(title)+'"></div>'
    +'<div><label class="tiny">' + (isEs ? 'Clave de sección' : 'Section key') + '</label><input disabled value="'+k+'"></div></div>'
    +'<div id="sectionEditor"></div></div>';
  host.appendChild(sec);
  el('includeSectionBox').onchange=function(e){ state.sections[k].include=e.target.checked; markDirty(); renderLatex(); };
  el('sectionTitleInput').oninput=function(e){ state.sections[k].title=e.target.value; el('sectionTitleInput2').value=e.target.value; markDirty(); renderLatex(); };
  
  if (k !== 'basics') {
    el('deleteSectionBtn').onclick = function() {
      var msg = isEs 
        ? '¿Está seguro de que desea eliminar la sección completa "' + human(k) + '"? Esta acción no se puede deshacer.'
        : 'Are you sure you want to delete the entire "' + human(k) + '" section from your CV? This cannot be undone.';
      if (confirm(msg)) {
        delete data[k];
        delete state.sections[k];
        var remaining = Object.keys(data).filter(function(x) { return x !== '_templates' && x !== 'templates'; });
        state.activeSection = remaining[0] || '';
        markDirty();
        renderAll();
      }
    };
  }

  var ed=host.querySelector('#sectionEditor');
  var value=data[k];
  if(isObj(value)) ed.appendChild(renderObjectFields([k],value));
  else if(Array.isArray(value)) ed.appendChild(renderArrayFields(k,value));
  bindPropRename(host);
}

function renderObjectFields(path,obj){
  var wrap=document.createElement('div'); wrap.className='subgrid';
  var section=path[0];
  var isEs = state.langFilter === 'es';
  Object.entries(obj).forEach(function(entry){
    var key=entry[0],val=entry[1];
    var propPath=section+'.'+path.slice(1).concat(key).join('.');
    if(Array.isArray(val)){
      var block=document.createElement('div'); block.className='card';
      block.id=section==='skills'?'skill-group-'+section+'-'+key:'field-'+section+'-'+key;
      block.innerHTML='<div class="cardhead"><strong>'+esc(state.propertyNames[propPath]||key)+'</strong></div><div class="cardbody subgrid">'+propRenameRow(propPath,key)+'</div>';
      var inner=block.querySelector('.cardbody');
      if(section==='skills') inner.appendChild(renderSkillsGroup(path.concat(key),val,propPath,key));
      else{
        val.forEach(function(item,idx){ inner.appendChild(simpleArrayInput(path.concat([key,idx]),item,propPath+'.'+idx)); });
        var add=document.createElement('button'); add.className='btn'; add.textContent=isEs ? 'Añadir elemento' : 'Add item';
        add.onclick=function(){ resolve(path.concat(key)).push(''); markDirty(); renderAll(); };
        inner.appendChild(add);
      }
      wrap.appendChild(block);
    } else if(isObj(val)){
      var block2=document.createElement('div'); block2.className='card'; block2.id='field-'+section+'-'+key;
      block2.innerHTML='<div class="cardhead"><strong>'+esc(state.propertyNames[propPath]||key)+'</strong></div><div class="cardbody subgrid">'+propRenameRow(propPath,key)+'</div>';
      block2.querySelector('.cardbody').appendChild(renderObjectFields(path.concat(key),val));
      wrap.appendChild(block2);
    } else if (key === 'photo') {
      var row=document.createElement('div'); row.className='propcard'; row.id='field-'+section+'-'+key;
      var imgHtml = val ? '<img src="' + esc(val) + '" style="max-height: 48px; border-radius: var(--radius-sm); border: 1.5px solid oklch(from var(--color-text) l c h / .15); background: var(--color-surface-offset); object-fit: cover;">' : '<div style="font-size: var(--text-lg)">👤</div>';
      row.innerHTML=propRenameRow(propPath,key)
        +'<div style="display:flex; align-items:center; gap:var(--space-3); margin-top:var(--space-2)">'
        +  imgHtml
        +  '<div style="display:flex; flex-direction:column; gap:var(--space-1); flex:1">'
        +    '<div style="display:flex; gap:var(--space-2)">'
        +      '<button class="btn btn-xs btn-primary" onclick="el(\'photoFileInput\').click()">' + (isEs ? 'Subir imagen' : 'Upload Image') + '</button>'
        +      (val ? '<button class="btn btn-xs btn-danger" id="clearPhotoBtn">' + (isEs ? 'Limpiar' : 'Clear') + '</button>' : '')
        +    '</div>'
        +    '<div class="tiny muted">' + (isEs ? 'Formatos: JPG, PNG. Guardado en la base de datos.' : 'Formats: JPG, PNG. Fully embedded in database.') + '</div>'
        +  '</div>'
        +'</div>'
        +'<input type="file" id="photoFileInput" accept="image/*" style="display:none">';
      
      setTimeout(function() {
        var fileIn = el('photoFileInput');
        if (fileIn) {
          fileIn.onchange = function(e) {
            var f = e.target.files[0];
            if (!f) return;
            var reader = new FileReader();
            reader.onload = function(ev) {
              setPath(path.concat(key), ev.target.result);
              markDirty();
              renderAll();
            };
            reader.readAsDataURL(f);
          };
        }
        var clearBtn = el('clearPhotoBtn');
        if (clearBtn) {
          clearBtn.onclick = function() {
            setPath(path.concat(key), '');
            markDirty();
            renderAll();
          };
        }
      }, 0);
      wrap.appendChild(row);
    } else {
      var row=document.createElement('div'); row.className='propcard'; row.id='field-'+section+'-'+key;
      row.innerHTML=propRenameRow(propPath,key);
      var isTextarea = (key === 'description' || key === 'research_interests' || key === 'summary');
      row.appendChild(makeInputWrapper(propPath, path.concat(key), val, isTextarea));
      wrap.appendChild(row);
    }
  });
  return wrap;
}

function renderSkillsGroup(path,arr,propPath,keyName){
  var wrap=document.createElement('div'); wrap.className='subgrid';
  var isEs = state.langFilter === 'es';
  arr.forEach(function(item,i){
    if (state.langFilter && state.langFilter !== 'all') {
      if (isObj(item) && item.lang && item.lang !== 'all' && item.lang !== state.langFilter) return;
    }
    var row=document.createElement('div'); row.className='entry';
    row.innerHTML='<div class="entryhead" style="display:flex; justify-content:space-between; align-items:center">'
      +'<div style="display:flex; align-items:center; gap:6px"><label class="pill"><input type="checkbox" '+(item.selected!==false?'checked':'')+'> ' + (isEs ? 'Incluido' : 'Include') + '</label>'
      +'<strong style="padding-left:var(--space-3)">'+esc(item.name||('item '+(i+1)))+'</strong></div>'
      +'<button class="btn btn-danger btn-xs" data-del-skill style="height:20px; padding:0 6px; font-size:var(--text-xxs)">' + (isEs ? 'Eliminar' : 'Delete') + '</button>'
      +'</div>'
      +'<div class="kv"><div class="mono">' + (isEs ? 'Etiqueta' : 'Label') + '</div><input type="text" value="'+esc(item.name||'')+'"></div>';
    (function(itm){ row.querySelector('input[type=checkbox]').onchange=function(e){ itm.selected=e.target.checked; markDirty(); renderLatex(); renderSchema(); }; })(item);
    (function(itm,rw){
      rw.querySelector('input[type=text]').oninput=function(e){
        itm.name=e.target.value; rw.querySelector('strong').textContent=e.target.value||('item '+(i+1));
        markDirty(); renderLatex(); renderSchema(); renderOutline();
      };
    })(item,row);
    (function(idx){
      var delBtn = row.querySelector('[data-del-skill]');
      if (delBtn) {
        delBtn.onclick = function() {
          var msg = isEs ? '¿Eliminar este elemento de habilidad?' : 'Delete this skill item?';
          if (confirm(msg)) {
            arr.splice(idx, 1);
            markDirty();
            renderAll();
          }
        };
      }
    })(i);
    wrap.appendChild(row);
  });
  var btn=document.createElement('button'); btn.className='btn'; btn.textContent=isEs ? 'Añadir habilidad' : 'Add skill item';
  btn.onclick=function(){ resolve(path).push({name:'',selected:true}); markDirty(); renderAll(); };
  wrap.appendChild(btn);
  return wrap;
}

function simpleArrayInput(path,val,propPath){
  var row=document.createElement('div'); row.className='propcard';
  row.innerHTML=(propPath?propRenameRow(propPath,String(path[path.length-1])):'');
  row.appendChild(makeInputWrapper(propPath || path.join('.'), path, val, false));
  return row;
}

function renderArrayFields(key,arr){
  var wrap=document.createElement('div'); wrap.className='subgrid';
  var isEs = state.langFilter === 'es';
  var toolbar=document.createElement('div'); toolbar.className='toolbar';
  toolbar.innerHTML='<button class="btn btn-ghost btn-xs" id="addEntryBtn" style="min-height:24px; height:24px; padding:2px 8px; font-size:var(--text-xs)">' + (isEs ? '+ Añadir entrada' : '+ Add entry') + '</button>';
  wrap.appendChild(toolbar);
  toolbar.querySelector('#addEntryBtn').onclick=function(){ addEntry(key); };
  arr.forEach(function(item,i){
    if (state.langFilter && state.langFilter !== 'all') {
      if (isObj(item) && item.lang && item.lang !== 'all' && item.lang !== state.langFilter) return;
    }
    var entry=document.createElement('div'); entry.className='entry'; entry.id=slugId(key,i);
    var label=(isObj(item)?(item.title||item.degree||item.role||item.organization||item.institution||item.language||item.description):String(item||''))||('#'+(i+1));
    
    var isIncluded = !isObj(item) || item.selected !== false;
    var isEmpty = false;
    if (isObj(item)) {
      var textFields = Object.entries(item).filter(function(fe) {
        return fe[0] !== 'selected' && fe[0] !== 'lang' && !Array.isArray(fe[1]);
      });
      if (textFields.length > 0) {
        var hasContent = textFields.some(function(fe) {
          var propPath = key + '.' + i + '.' + fe[0];
          var val = fe[1];
          if (activeInstance && activeInstance.overwrites && activeInstance.overwrites[propPath] !== undefined) {
            val = activeInstance.overwrites[propPath];
          }
          return String(val || '').trim().length > 0;
        });
        isEmpty = !hasContent;
      }
    } else {
      var propPath = key + '.' + i;
      var val = item;
      if (activeInstance && activeInstance.overwrites && activeInstance.overwrites[propPath] !== undefined) {
        val = activeInstance.overwrites[propPath];
      }
      isEmpty = !String(val || '').trim();
    }
    
    var warningIcon = (isIncluded && isEmpty) ? '<span class="warn-icon" title="Included but empty" style="color:var(--color-warning); cursor:help; font-size:var(--text-sm); margin-left:var(--space-2)">⚠️</span>' : '';

    entry.innerHTML='<div class="entryhead">'
      +'<div class="stack" style="gap:6px; flex-direction:row; align-items:center">'
      +'<label class="pill"><input type="checkbox" '+(!isObj(item)||item.selected!==false?'checked':'')+' data-sel> ' + (isEs ? 'Incluido' : 'Included') + '</label>'
      +'<select class="db-select" style="height:24px; padding:0 4px; font-size:var(--text-xs); border-radius:var(--radius-sm); border:1px solid oklch(from var(--color-text) l c h / .1); background:var(--color-surface-offset); color:var(--color-text)" data-lang>'
      +'<option value="all">' + (isEs ? 'Idioma: Todos' : 'Lang: All') + '</option>'
      +'<option value="en">' + (isEs ? 'Idioma: EN' : 'Lang: EN') + '</option>'
      +'<option value="es">' + (isEs ? 'Idioma: ES' : 'Lang: ES') + '</option>'
      +'</select>'
      +'<strong>'+esc(label)+'</strong>' + warningIcon + '</div>'
      +'<div class="toolbar">'
      +'<button class="btn btn-ghost btn-xs" data-up style="font-weight:bold; padding:2px 8px; font-size:var(--text-xs)">↑</button>'
      +'<button class="btn btn-ghost btn-xs" data-down style="font-weight:bold; padding:2px 8px; font-size:var(--text-xs)">↓</button>'
      +'<button class="btn btn-ghost btn-xs" data-dup style="padding:2px 8px; font-size:var(--text-xs)">' + (isEs ? 'Duplicar' : 'Duplicate') + '</button>'
      +'<button class="btn btn-danger btn-xs" data-del style="padding:2px 8px; font-size:var(--text-xs)">' + (isEs ? 'Eliminar' : 'Delete') + '</button>'
      +'</div>'
      +'</div><div class="entrybody"></div>';
    var body=entry.querySelector('.entrybody');
    if(isObj(item)){
      Object.entries(item).forEach(function(fe){
        var field=fe[0],val=fe[1]; if(field==='selected' || field==='lang') return;
        var propPath=key+'.'+i+'.'+field;
        if(Array.isArray(val)){
          var block=document.createElement('div'); block.className='card';
          block.innerHTML='<div class="cardhead"><strong>'+esc(state.propertyNames[propPath]||field)+'</strong></div><div class="cardbody subgrid">'+propRenameRow(propPath,field)+'</div>';
          var inner=block.querySelector('.cardbody');
          val.forEach(function(sub,j){ inner.appendChild(simpleArrayInput([key,i,field,j],sub,propPath+'.'+j)); });
          var btn=document.createElement('button'); btn.className='btn btn-xs'; btn.textContent=isEs ? 'Añadir elemento' : 'Add item';
          (function(kk,ii,ff){ btn.onclick=function(){ resolve([kk,ii,ff]).push(''); markDirty(); renderAll(); }; })(key,i,field);
          inner.appendChild(btn); body.appendChild(block);
        } else if(isObj(val)){
          var card=document.createElement('div'); card.className='card';
          card.innerHTML='<div class="cardhead"><strong>'+esc(state.propertyNames[propPath]||field)+'</strong></div><div class="cardbody subgrid">'+propRenameRow(propPath,field)+'</div>';
          card.querySelector('.cardbody').appendChild(renderObjectFields([key,i,field],val));
          body.appendChild(card);
        } else {
          var row=document.createElement('div'); row.className='propcard';
          row.innerHTML=propRenameRow(propPath,field);
          var isTextarea = (field === 'description' || field === 'research_interests' || field === 'summary');
          row.appendChild(makeInputWrapper(propPath, [key,i,field], val, isTextarea));
          body.appendChild(row);
        }
      });
    } else { body.appendChild(simpleArrayInput([key,i],item,key+'.'+i)); }

    var upBtn = entry.querySelector('[data-up]');
    var downBtn = entry.querySelector('[data-down]');
    upBtn.disabled = (i === 0);
    downBtn.disabled = (i === arr.length - 1);
    
    (function(idx){
      upBtn.onclick = function() {
        var temp = arr[idx];
        arr[idx] = arr[idx - 1];
        arr[idx - 1] = temp;
        markDirty();
        renderAll();
      };
      downBtn.onclick = function() {
        var temp = arr[idx];
        arr[idx] = arr[idx + 1];
        arr[idx + 1] = temp;
        markDirty();
        renderAll();
      };
    })(i);

    if(isObj(item)){
      var langSelect = entry.querySelector('[data-lang]');
      langSelect.value = item.lang || 'all';
      (function(itm){
        langSelect.onchange = function(e) {
          itm.lang = e.target.value;
          markDirty();
          renderLatex();
          renderHtmlPreview();
          renderSchema();
        };
      })(item);
    } else {
      var langSelect = entry.querySelector('[data-lang]');
      if (langSelect) langSelect.style.display = 'none';
    }

    var isIncluded = true;
    if (activeInstance && activeInstance.visibility && activeInstance.visibility[key] && activeInstance.visibility[key][i] !== undefined) {
      isIncluded = activeInstance.visibility[key][i];
    } else {
      isIncluded = (!isObj(item) || item.selected !== false);
    }
    var selCheckbox = entry.querySelector('[data-sel]');
    selCheckbox.checked = isIncluded;
    
    (function(idx, itm){
      selCheckbox.onchange = function(e) {
        if (activeInstance) {
          if (!activeInstance.visibility) activeInstance.visibility = {};
          if (!activeInstance.visibility[key]) activeInstance.visibility[key] = [];
          activeInstance.visibility[key][idx] = e.target.checked;
          saveCurrentInstance();
          renderLatex();
          renderHtmlPreview();
          renderSchema();
        } else {
          if (isObj(itm)) itm.selected = e.target.checked;
          markDirty();
          renderLatex();
          renderSchema();
        }
      };
    })(i, item);
    (function(idx){ entry.querySelector('[data-dup]').onclick=function(){ arr.splice(idx+1,0,clone(arr[idx])); markDirty(); renderAll(); }; })(i);
    (function(idx){ entry.querySelector('[data-del]').onclick=function(){ arr.splice(idx,1); markDirty(); renderAll(); }; })(i);
    wrap.appendChild(entry);
  });
  return wrap;
}

function resolve(path){ return path.reduce(function(acc,key){ return acc[key]; },data); }
function setPath(path,value){
  var last=path[path.length-1];
  var ref=path.slice(0,-1).reduce(function(acc,key){ return acc[key]; },data);
  ref[last]=value; markDirty(); renderLatex(); renderSchema(); renderOutline();
}

function addEntry(key){
  var arr=data[key]; var template=null;
  for(var i=0;i<arr.length;i++){ if(isObj(arr[i])){ template=arr[i]; break; } }
  if(template){
    var entry={};
    Object.keys(template).forEach(function(k){ entry[k]=k==='selected'?true:(Array.isArray(template[k])?[]:''); });
    arr.push(entry);
  } else arr.push({selected:true});
  markDirty(); renderAll();
  var newId=slugId(key,arr.length-1), newEl=document.getElementById(newId);
  if(newEl){ newEl.scrollIntoView({behavior:'smooth',block:'start'}); var inp=newEl.querySelector('input:not([type=checkbox]),textarea'); if(inp) setTimeout(function(){ inp.focus(); },120); }
}
