/**
 * CVbuilder browser-level AI tools registry
 * Implements MCP-style function calling directly in the browser context.
 */

var AITools = (function() {
  
  function getCurrentCvData() {
    if (typeof data === 'undefined') return { error: "No CV data loaded." };
    var cvCopy = JSON.parse(JSON.stringify(data));
    delete cvCopy.instances;
    delete cvCopy._templates;
    delete cvCopy.templates;
    return cvCopy;
  }

  function createCvInstance(instanceName, overrides) {
    if (typeof data === 'undefined') return { error: "No CV data loaded." };
    if (!data.instances) data.instances = {};
    var currentStyle = (typeof getActiveStyle === 'function') ? getActiveStyle() : (data._style || {});
    data.instances[instanceName] = {
      style: JSON.parse(JSON.stringify(currentStyle)),
      overwrites: overrides || {},
      visibility: {},
      propertyNames: {},
      sections: (typeof state === 'object' && state && state.sections) ? JSON.parse(JSON.stringify(state.sections)) : {}
    };
    if (typeof loadInstance === 'function') {
      loadInstance(instanceName);
    }
    return { status: "Success", message: "Created and loaded tailored instance '" + instanceName + "'." };
  }

  function listCvInstances() {
    if (typeof data === 'undefined' || !data.instances) return [];
    return Object.keys(data.instances);
  }

  function loadCvInstance(instanceName) {
    if (typeof loadInstance === 'function') {
      loadInstance(instanceName);
      return { status: "Success", message: "Loaded instance '" + instanceName + "'." };
    }
    return { error: "loadInstance function not available." };
  }

  function deleteCvInstance(instanceName) {
    if (typeof data === 'undefined' || !data.instances) return { error: "No instances exist." };
    if (!data.instances[instanceName]) return { error: "Instance not found." };
    delete data.instances[instanceName];
    if (typeof currentInstanceName !== 'undefined' && currentInstanceName === instanceName) {
      if (typeof loadInstance === 'function') loadInstance('None (Master CV)');
    } else {
      if (typeof saveCurrentDatabase === 'function') saveCurrentDatabase();
      if (typeof updateInstanceSelector === 'function') updateInstanceSelector();
    }
    return { status: "Success", message: "Deleted instance '" + instanceName + "'." };
  }

  function createCvSection(title, key, structureType) {
    if (typeof data === 'undefined') return { error: "No CV data loaded." };
    var cleanKey = key.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
    if (data[cleanKey]) return { error: "Section with key '" + cleanKey + "' already exists." };

    var def = (window.SECTION_DEFS || []).find(function(d) { return d.id === structureType; });
    var newSectionData;
    if (def && def.template) {
      if (def.dataType === 'array') {
        newSectionData = [JSON.parse(JSON.stringify(def.template))];
      } else {
        newSectionData = JSON.parse(JSON.stringify(def.template));
      }
      if (def.mapper && typeof mappers === 'object' && mappers) {
        mappers[cleanKey] = def.mapper;
      }
    } else {
      newSectionData = [{
        role: '', organization: '', department: '', start: '', end: '', description: '', selected: true
      }];
      if (typeof mappers === 'object' && mappers) mappers[cleanKey] = 'cventry_work';
    }

    data[cleanKey] = newSectionData;
    if (typeof state === 'object' && state && state.sections) {
      state.sections[cleanKey] = { include: true, title: title };
      state.activeSection = cleanKey;
    }
    if (typeof markDirty === 'function') markDirty();
    if (typeof renderAll === 'function') renderAll();

    return { status: "Success", message: "Created section '" + title + "' with key '" + cleanKey + "'." };
  }

  function renameCvSection(sectionKey, newTitle) {
    if (typeof state === 'undefined' || !state || !state.sections || !state.sections[sectionKey]) {
      return { error: "Section '" + sectionKey + "' not found." };
    }
    state.sections[sectionKey].title = newTitle;
    if (typeof markDirty === 'function') markDirty();
    if (typeof renderAll === 'function') renderAll();
    return { status: "Success", message: "Renamed section '" + sectionKey + "' to '" + newTitle + "'." };
  }

  function addSectionEntry(sectionKey, entryData) {
    if (typeof data === 'undefined' || !data[sectionKey]) return { error: "Section '" + sectionKey + "' not found." };
    if (!Array.isArray(data[sectionKey])) return { error: "Section '" + sectionKey + "' is not an array section." };

    var template = {};
    var def = (window.SECTION_DEFS || []).find(function(d) { return d.mapper === (typeof mappers !== 'undefined' && mappers ? mappers[sectionKey] : ''); }) || 
              (window.SECTION_DEFS || []).find(function(d) { return data[sectionKey][0] && Object.keys(d.template).every(function(k) { return k in data[sectionKey][0]; }); });
    if (def) {
      template = JSON.parse(JSON.stringify(def.template));
    }
    var newEntry = Object.assign({ selected: true }, template, entryData || {});
    data[sectionKey].push(newEntry);

    if (typeof markDirty === 'function') markDirty();
    if (typeof renderAll === 'function') renderAll();
    return { status: "Success", message: "Added entry to section '" + sectionKey + "'.", index: data[sectionKey].length - 1 };
  }

  function deleteSectionEntry(sectionKey, index) {
    if (typeof data === 'undefined' || !data[sectionKey]) return { error: "Section '" + sectionKey + "' not found." };
    if (!Array.isArray(data[sectionKey])) return { error: "Section is not an array." };
    if (index < 0 || index >= data[sectionKey].length) return { error: "Index " + index + " out of bounds." };

    data[sectionKey].splice(index, 1);
    if (typeof markDirty === 'function') markDirty();
    if (typeof renderAll === 'function') renderAll();
    return { status: "Success", message: "Deleted entry at index " + index + " from section '" + sectionKey + "'." };
  }

  function updateMasterCvField(pathStr, value) {
    if (typeof setPath === 'function') {
      var pathArray = pathStr.split('.');
      setPath(pathArray, value);
      return { status: "Success", message: "Field '" + pathStr + "' updated to '" + value + "'." };
    }
    return { error: "setPath function not available." };
  }

  // Helper function to safely set deep nested objects
  function setDeepValue(obj, path, val) {
    var parts = path.split('.');
    var current = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      var part = parts[i];
      if (current[part] === undefined) {
        current[part] = {};
      }
      current = current[part];
    }
    current[parts[parts.length - 1]] = val;
  }

  function updateInstanceOverwrite(instanceName, pathStr, value) {
    if (typeof data === 'undefined' || !data.instances) return { error: "No instances exist." };
    var inst = data.instances[instanceName];
    if (!inst) return { error: "Instance '" + instanceName + "' not found." };
    if (!inst.overwrites) inst.overwrites = {};
    inst.overwrites[pathStr] = value;

    if (typeof saveCurrentDatabase === 'function') saveCurrentDatabase();
    if (typeof currentInstanceName !== 'undefined' && currentInstanceName === instanceName) {
      if (typeof loadInstance === 'function') loadInstance(instanceName);
    }
    return { status: "Success", message: "Overwrite '" + pathStr + "' set to '" + value + "' in instance '" + instanceName + "'." };
  }

  // MCP declarations metadata for the AI model
  var DECLARATIONS = [
    {
      name: 'getCurrentCvData',
      description: 'Returns the master CV profile data in JSON format.',
      parameters: { type: 'OBJECT', properties: {} }
    },
    {
      name: 'createCvInstance',
      description: 'Creates a new tailored CV instance with overrides for a specific job and loads it.',
      parameters: {
        type: 'OBJECT',
        properties: {
          instanceName: { type: 'STRING', description: 'The name of the new tailored instance.' },
          overrides: { type: 'OBJECT', description: 'A flat key-value map of path overrides, e.g. {"basics.summary": "...", "work.0.description": "..."}' }
        },
        required: ['instanceName', 'overrides']
      }
    },
    {
      name: 'listCvInstances',
      description: 'Lists the names of all current tailored CV instances.',
      parameters: { type: 'OBJECT', properties: {} }
    },
    {
      name: 'loadCvInstance',
      description: 'Loads a specific tailored instance into the editor UI.',
      parameters: {
        type: 'OBJECT',
        properties: {
          instanceName: { type: 'STRING', description: 'The name of the instance to load, or "None (Master CV)" to return to master.' }
        },
        required: ['instanceName']
      }
    },
    {
      name: 'deleteCvInstance',
      description: 'Deletes a specific tailored CV instance.',
      parameters: {
        type: 'OBJECT',
        properties: {
          instanceName: { type: 'STRING', description: 'The name of the instance to delete.' }
        },
        required: ['instanceName']
      }
    },
    {
      name: 'createCvSection',
      description: 'Creates a new custom section in the CV with a layout template.',
      parameters: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING', description: 'The display name of the new section, e.g. "Projects".' },
          key: { type: 'STRING', description: 'The unique alphanumeric key for the section, e.g. "projects".' },
          structureType: { type: 'STRING', description: 'The structure layout: "experience", "education", "publication", "teaching", "award", "skills", or "simple".' }
        },
        required: ['title', 'key', 'structureType']
      }
    },
    {
      name: 'renameCvSection',
      description: 'Renames the display title of an existing CV section.',
      parameters: {
        type: 'OBJECT',
        properties: {
          sectionKey: { type: 'STRING', description: 'The key of the section to rename, e.g. "work".' },
          newTitle: { type: 'STRING', description: 'The new display title.' }
        },
        required: ['sectionKey', 'newTitle']
      }
    },
    {
      name: 'addSectionEntry',
      description: 'Appends a new pre-populated data entry to an array section (e.g. work, education).',
      parameters: {
        type: 'OBJECT',
        properties: {
          sectionKey: { type: 'STRING', description: 'The key of the target section.' },
          entryData: { type: 'OBJECT', description: 'The key-value field data for the entry.' }
        },
        required: ['sectionKey', 'entryData']
      }
    },
    {
      name: 'deleteSectionEntry',
      description: 'Deletes an entry from a section at the specified index.',
      parameters: {
        type: 'OBJECT',
        properties: {
          sectionKey: { type: 'STRING', description: 'The key of the section.' },
          index: { type: 'INTEGER', description: 'The 0-based index of the entry to delete.' }
        },
        required: ['sectionKey', 'index']
      }
    },
    {
      name: 'updateMasterCvField',
      description: 'Directly modifies a specific field in the master CV profile.',
      parameters: {
        type: 'OBJECT',
        properties: {
          pathStr: { type: 'STRING', description: 'The dot-separated path to the field, e.g. "basics.email" or "work.0.description".' },
          value: { type: 'STRING', description: 'The new value to set.' }
        },
        required: ['pathStr', 'value']
      }
    },
    {
      name: 'updateInstanceOverwrite',
      description: 'Updates a specific override value inside a tailored CV instance.',
      parameters: {
        type: 'OBJECT',
        properties: {
          instanceName: { type: 'STRING', description: 'The name of the tailored instance.' },
          pathStr: { type: 'STRING', description: 'The path of the field to override, e.g. "basics.summary".' },
          value: { type: 'STRING', description: 'The override value.' }
        },
        required: ['instanceName', 'pathStr', 'value']
      }
    }
  ];

  function executeTool(name, args) {
    switch (name) {
      case 'getCurrentCvData': return getCurrentCvData();
      case 'createCvInstance': return createCvInstance(args.instanceName, args.overrides);
      case 'listCvInstances': return listCvInstances();
      case 'loadCvInstance': return loadCvInstance(args.instanceName);
      case 'deleteCvInstance': return deleteCvInstance(args.instanceName);
      case 'createCvSection': return createCvSection(args.title, args.key, args.structureType);
      case 'renameCvSection': return renameCvSection(args.sectionKey, args.newTitle);
      case 'addSectionEntry': return addSectionEntry(args.sectionKey, args.entryData);
      case 'deleteSectionEntry': return deleteSectionEntry(args.sectionKey, args.index);
      case 'updateMasterCvField': return updateMasterCvField(args.pathStr, args.value);
      case 'updateInstanceOverwrite': return updateInstanceOverwrite(args.instanceName, args.pathStr, args.value);
      default: return { error: "Unknown tool: " + name };
    }
  }

  return {
    executeTool: executeTool,
    DECLARATIONS: DECLARATIONS
  };

})();
