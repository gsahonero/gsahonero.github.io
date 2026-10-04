/**
 * CV Database Integrity Checker
 * Validates the structure, types, coherence, and consistency of .cv database files.
 */

var CvIntegrityChecker = (function() {

  // Helper to check if a value is a plain object
  function isObj(val) {
    return val !== null && typeof val === 'object' && !Array.isArray(val);
  }

  // Helper to get a value by path (e.g. "education.0.degree")
  function getValueByPath(obj, path) {
    if (!obj || !path) return undefined;
    var parts = path.split('.');
    var current = obj;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (current === null || current === undefined) return undefined;
      // Handle array indices
      if (Array.isArray(current)) {
        var idx = parseInt(p, 10);
        if (isNaN(idx)) return undefined;
        current = current[idx];
      } else if (isObj(current)) {
        current = current[p];
      } else {
        return undefined;
      }
    }
    return current;
  }

  // Helper to check if a path exists in obj
  function pathExists(obj, path) {
    if (!obj || !path) return false;
    var parts = path.split('.');
    var current = obj;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (current === null || current === undefined) return false;
      if (Array.isArray(current)) {
        var idx = parseInt(p, 10);
        if (isNaN(idx) || idx < 0 || idx >= current.length) return false;
        current = current[idx];
      } else if (isObj(current)) {
        if (!(p in current)) return false;
        current = current[p];
      } else {
        return false;
      }
    }
    return true;
  }

  // Translate component/check names for display if needed
  function validate(cvData) {
    var checks = [];
    var totals = { passed: 0, warnings: 0, errors: 0 };

    function addCheck(component, name, details, status) {
      checks.push({
        component: component,
        name: name,
        details: details,
        status: status
      });
      if (status === 'success') totals.passed++;
      else if (status === 'warning') totals.warnings++;
      else if (status === 'error') totals.errors++;
    }

    // 1. Root structure validations
    if (!cvData) {
      addCheck('Root Structure', 'Presence', 'The uploaded CV database file is empty or null.', 'error');
      return { totals: totals, checks: checks };
    }

    if (!isObj(cvData)) {
      addCheck('Root Structure', 'Type Validation', 'Database root must be a JSON object.', 'error');
      return { totals: totals, checks: checks };
    }
    addCheck('Root Structure', 'Type Validation', 'Root object is valid JSON.', 'success');

    // Check basics
    if (!cvData.basics) {
      addCheck('Root Structure', 'Basics Presence', 'Missing critical "basics" profile block.', 'error');
    } else if (!isObj(cvData.basics)) {
      addCheck('Root Structure', 'Basics Type', '"basics" must be a JSON object.', 'error');
    } else {
      addCheck('Root Structure', 'Basics Block', '"basics" profile is present.', 'success');
      
      // Validate basics fields
      var basicsFields = ['firstname', 'lastname', 'title', 'email', 'homepage', 'location', 'photo', 'research_interests'];
      var basicsObj = cvData.basics;
      var wrongTypes = [];
      basicsFields.forEach(function(f) {
        if (f in basicsObj && basicsObj[f] !== null && typeof basicsObj[f] !== 'string') {
          wrongTypes.push(f + ' (' + typeof basicsObj[f] + ')');
        }
      });
      
      if (wrongTypes.length > 0) {
        addCheck('Basics Profile', 'Field Types', 'Fields must be strings: ' + wrongTypes.join(', '), 'error');
      } else {
        addCheck('Basics Profile', 'Field Types', 'All profile text fields are valid strings.', 'success');
      }

      if (!basicsObj.firstname && !basicsObj.lastname) {
        addCheck('Basics Profile', 'Name Fields', 'Both firstname and lastname are empty.', 'warning');
      } else {
        addCheck('Basics Profile', 'Name Fields', 'Primary name fields are populated.', 'success');
      }
    }

    // 2. Style Configurations
    if (cvData._style) {
      if (!isObj(cvData._style)) {
        addCheck('Style Configuration', 'Type Validation', '"_style" must be an object.', 'error');
      } else {
        addCheck('Style Configuration', 'Type Validation', 'Global style configuration object is valid.', 'success');
        
        var styleObj = cvData._style;
        if (styleObj.mappers && !isObj(styleObj.mappers)) {
          addCheck('Style Configuration', 'Mappers Type', 'Mappers must be an object.', 'error');
        } else {
          var mappers = styleObj.mappers || {};
          var validMappers = [
            'cventry_education', 'cventry_research', 'cventry_work', 
            'cventry_teaching', 'publications', 'abstracts', 'awards', 
            'continuing_education', 'skills', 'languages', 'generic'
          ];
          
          var invalidMappers = [];
          Object.keys(mappers).forEach(function(k) {
            var m = mappers[k];
            if (validMappers.indexOf(m) === -1) {
              invalidMappers.push(k + ' -> ' + m);
            }
          });
          
          if (invalidMappers.length > 0) {
            addCheck('Style Configuration', 'Mapper Validation', 'Unknown mappers defined: ' + invalidMappers.join(', '), 'warning');
          } else {
            addCheck('Style Configuration', 'Mapper Validation', 'All defined compiler mappers are valid.', 'success');
          }
        }

        // Validate HTML and LaTeX templates for structural integrity (detecting sanitization tags stripping)
        if (styleObj.htmlTemplate && typeof styleObj.htmlTemplate === 'string') {
          if (styleObj.htmlTemplate.indexOf('<style>') === -1 && styleObj.htmlTemplate.indexOf('body {') !== -1) {
            addCheck('Style Configuration', 'HTML Template Structure', 'HTML style template is missing HTML tags like <style> (possibly stripped by sanitizer).', 'warning');
          } else {
            addCheck('Style Configuration', 'HTML Template Structure', 'HTML style template structure looks normal.', 'success');
          }
        }
        if (styleObj.latexTemplate && typeof styleObj.latexTemplate === 'string') {
          if (styleObj.latexTemplate.indexOf('\\documentclass') === -1) {
            addCheck('Style Configuration', 'LaTeX Template Structure', 'LaTeX template is missing basic class definition \\documentclass.', 'warning');
          } else {
            addCheck('Style Configuration', 'LaTeX Template Structure', 'LaTeX template structure looks normal.', 'success');
          }
        }
      }
    } else {
      addCheck('Style Configuration', 'Presence', 'Global style configuration is missing.', 'warning');
    }

    // 3. Section Definitions consistency (_sections)
    var ignoredKeys = ['basics', 'research_interests', '_templates', 'templates', '_hiddenFields', 'all_sections', 'labels', 'theme', 'sections', 'instances', '_style', '_sections'];
    var dataSectionKeys = Object.keys(cvData).filter(function(k) {
      return ignoredKeys.indexOf(k) === -1 && k.indexOf('_') !== 0;
    });

    if (cvData._sections) {
      if (!isObj(cvData._sections)) {
        addCheck('Section Registry', 'Type Validation', '"_sections" metadata must be an object.', 'error');
      } else {
        var missingMeta = [];
        dataSectionKeys.forEach(function(k) {
          if (!cvData._sections[k]) {
            missingMeta.push(k);
          }
        });

        if (missingMeta.length > 0) {
          addCheck('Section Registry', 'Registry Match', 'Database contains sections with missing metadata config: ' + missingMeta.join(', '), 'warning');
        } else {
          addCheck('Section Registry', 'Registry Match', 'All database sections have a corresponding entry in the metadata registry.', 'success');
        }

        var orphanedMeta = [];
        Object.keys(cvData._sections).forEach(function(k) {
          if (dataSectionKeys.indexOf(k) === -1) {
            orphanedMeta.push(k);
          }
        });

        if (orphanedMeta.length > 0) {
          addCheck('Section Registry', 'Orphaned Metadata', 'Orphaned configuration entries found for non-existent sections: ' + orphanedMeta.join(', '), 'warning');
        } else {
          addCheck('Section Registry', 'Orphaned Metadata', 'No orphaned section configuration metadata found.', 'success');
        }

        // Validate format of each registry entry
        var badMeta = [];
        Object.keys(cvData._sections).forEach(function(k) {
          var entry = cvData._sections[k];
          if (!isObj(entry) || typeof entry.title !== 'string' || (entry.include !== undefined && typeof entry.include !== 'boolean')) {
            badMeta.push(k);
          }
        });

        if (badMeta.length > 0) {
          addCheck('Section Registry', 'Metadata Schema', 'Malformed section configurations (missing string title or boolean include): ' + badMeta.join(', '), 'warning');
        } else {
          addCheck('Section Registry', 'Metadata Schema', 'All registry configurations match expected schema.', 'success');
        }
      }
    } else {
      addCheck('Section Registry', 'Presence', 'Database missing "_sections" registry block.', 'warning');
    }

    // 4. Section Data Consistency & Integrity
    dataSectionKeys.forEach(function(key) {
      var val = cvData[key];
      var componentName = 'Section: ' + key;

      if (key === 'skills') {
        // Special case: skills
        if (!isObj(val)) {
          addCheck(componentName, 'Data Type', 'Skills section must be a category object map.', 'error');
        } else {
          var badCategories = [];
          var categoryKeys = Object.keys(val);
          
          categoryKeys.forEach(function(cat) {
            var items = val[cat];
            if (!Array.isArray(items)) {
              badCategories.push(cat + ' (not an array)');
              return;
            }
            items.forEach(function(it, idx) {
              if (!isObj(it) || typeof it.name !== 'string' || (it.selected !== undefined && typeof it.selected !== 'boolean')) {
                badCategories.push(cat + '[' + idx + '] (invalid structure)');
              }
            });
          });

          if (badCategories.length > 0) {
            addCheck(componentName, 'Schema Integrity', 'Invalid category structures: ' + badCategories.join(', '), 'error');
          } else {
            addCheck(componentName, 'Schema Integrity', 'Skills dictionary structure is clean and valid.', 'success');
          }
        }
      } else {
        // Normal array section or string section
        if (Array.isArray(val)) {
          var malformedItems = [];
          val.forEach(function(item, idx) {
            if (!isObj(item)) {
              malformedItems.push('Item ' + idx + ' is not an object');
              return;
            }

            // Check selected flag
            if (item.selected !== undefined && typeof item.selected !== 'boolean') {
              malformedItems.push('Item ' + idx + ' selected status is not boolean');
            }

            // Check array types for teaching courses
            if (item.courses && !Array.isArray(item.courses)) {
              malformedItems.push('Item ' + idx + ' "courses" must be an array');
            }
          });

          if (malformedItems.length > 0) {
            addCheck(componentName, 'Schema Integrity', 'Malformed items found: ' + malformedItems.join('; '), 'error');
          } else {
            addCheck(componentName, 'Schema Integrity', 'All entries are valid array objects.', 'success');
          }
        } else if (typeof val === 'string') {
          addCheck(componentName, 'Data Type', 'Section is a plain text string.', 'success');
        } else {
          addCheck(componentName, 'Data Type', 'Section must be an array of items or plain text string.', 'error');
        }
      }
    });

    // 5. CV Instances Consistency
    if (cvData.instances) {
      if (!isObj(cvData.instances)) {
        addCheck('CV Instances', 'Type Validation', '"instances" must be a JSON object.', 'error');
      } else {
        var instanceNames = Object.keys(cvData.instances);
        addCheck('CV Instances', 'Registry Check', 'Found ' + instanceNames.length + ' saved CV instances.', 'success');

        instanceNames.forEach(function(instName) {
          var inst = cvData.instances[instName];
          var instComponent = 'Instance: ' + instName;

          if (!isObj(inst)) {
            addCheck(instComponent, 'Schema Integrity', 'Instance data is malformed.', 'error');
            return;
          }

          // Check overwrites
          if (inst.overwrites) {
            if (!isObj(inst.overwrites)) {
              addCheck(instComponent, 'Overwrites Format', '"overwrites" must be a key-value object.', 'error');
            } else {
              var orphanedOverwrites = [];
              Object.keys(inst.overwrites).forEach(function(path) {
                if (!pathExists(cvData, path)) {
                  orphanedOverwrites.push(path);
                }
              });

              if (orphanedOverwrites.length > 0) {
                addCheck(instComponent, 'Orphaned Overwrites', 'Orphaned overwrites pointing to non-existent fields/items in Master CV: ' + orphanedOverwrites.join(', '), 'warning');
              } else {
                addCheck(instComponent, 'Orphaned Overwrites', 'All field overrides map correctly to Master CV data.', 'success');
              }
            }
          }

          // Check visibility settings
          if (inst.visibility) {
            if (!isObj(inst.visibility)) {
              addCheck(instComponent, 'Visibility Format', '"visibility" must be a key-value object.', 'error');
            } else {
              var orphanedVisibility = [];
              var mismatchedVisibility = [];

              Object.keys(inst.visibility).forEach(function(path) {
                if (!pathExists(cvData, path)) {
                  orphanedVisibility.push(path);
                  return;
                }

                // Check length bounds if it's an array visibility map
                var masterVal = getValueByPath(cvData, path);
                var visVal = inst.visibility[path];
                if (Array.isArray(masterVal) && Array.isArray(visVal)) {
                  if (visVal.length !== masterVal.length) {
                    mismatchedVisibility.push(path + ' (Instance has ' + visVal.length + ' vs Master ' + masterVal.length + ')');
                  }
                }
              });

              if (orphanedVisibility.length > 0) {
                addCheck(instComponent, 'Orphaned Visibility', 'Orphaned visibility filters pointing to non-existent entries: ' + orphanedVisibility.join(', '), 'warning');
              } else {
                addCheck(instComponent, 'Orphaned Visibility', 'All visibility paths exist in Master CV.', 'success');
              }

              if (mismatchedVisibility.length > 0) {
                addCheck(instComponent, 'Visibility Length Mismatch', 'Array size mismatches in visibility maps: ' + mismatchedVisibility.join(', '), 'warning');
              } else {
                addCheck(instComponent, 'Visibility Length Mismatch', 'All array visibility maps match Master CV sizes.', 'success');
              }
            }
          }

          // Check style overrides
          if (inst.style) {
            if (!isObj(inst.style)) {
              addCheck(instComponent, 'Style Overrides', 'Style override must be a JSON object.', 'error');
            } else {
              addCheck(instComponent, 'Style Overrides', 'Visual style configurations are valid.', 'success');
            }
          }

          // Check sections overrides
          if (inst.sections) {
            if (!isObj(inst.sections)) {
              addCheck(instComponent, 'Sections Overrides', 'Sections override configuration must be an object.', 'error');
            } else {
              var orphanedSections = [];
              Object.keys(inst.sections).forEach(function(secKey) {
                if (dataSectionKeys.indexOf(secKey) === -1 && secKey !== 'basics') {
                  orphanedSections.push(secKey);
                }
              });

              if (orphanedSections.length > 0) {
                addCheck(instComponent, 'Orphaned Section Overrides', 'Section overrides for non-existent sections: ' + orphanedSections.join(', '), 'warning');
              } else {
                addCheck(instComponent, 'Orphaned Section Overrides', 'All section toggles map to actual sections.', 'success');
              }
            }
          }
        });
      }
    }

    return {
      totals: totals,
      checks: checks
    };
  }

  function fix(cvData) {
    if (!cvData || typeof cvData !== 'object' || Array.isArray(cvData)) {
      return cvData;
    }

    var fixed = JSON.parse(JSON.stringify(cvData));

    // 1. Basics
    fixed.basics = fixed.basics || {};
    if (!isObj(fixed.basics)) {
      fixed.basics = { firstname: "", lastname: "" };
    }
    var basicsFields = ['firstname', 'lastname', 'title', 'email', 'homepage', 'location', 'photo', 'research_interests'];
    basicsFields.forEach(function(f) {
      if (f in fixed.basics && fixed.basics[f] !== null && typeof fixed.basics[f] !== 'string') {
        if (Array.isArray(fixed.basics[f])) {
          fixed.basics[f] = fixed.basics[f].join(', ');
        } else if (typeof fixed.basics[f] === 'object') {
          fixed.basics[f] = fixed.basics[f].name || fixed.basics[f].description || String(fixed.basics[f]);
        } else {
          fixed.basics[f] = String(fixed.basics[f]);
        }
      }
    });

    // 2. Style
    if (!fixed._style || !isObj(fixed._style)) {
      if (typeof DEFAULT_STYLE !== 'undefined') {
        fixed._style = JSON.parse(JSON.stringify(DEFAULT_STYLE));
      } else {
        fixed._style = { style: "classic", cvTitle: "Curriculum Vitae" };
      }
    }
    
    // Fix mappers
    fixed._style.mappers = fixed._style.mappers || {};
    if (!isObj(fixed._style.mappers)) {
      if (typeof DEFAULT_MAPPERS !== 'undefined') {
        fixed._style.mappers = JSON.parse(JSON.stringify(DEFAULT_MAPPERS));
      } else {
        fixed._style.mappers = {};
      }
    } else {
      var validMappers = [
        'cventry_education', 'cventry_research', 'cventry_work', 
        'cventry_teaching', 'publications', 'abstracts', 'awards', 
        'continuing_education', 'skills', 'languages', 'generic'
      ];
      Object.keys(fixed._style.mappers).forEach(function(k) {
        var m = fixed._style.mappers[k];
        if (validMappers.indexOf(m) === -1) {
          delete fixed._style.mappers[k];
        }
      });
    }

    // Fix templates (sanitization recovery!)
    if (fixed._style.htmlTemplate && typeof fixed._style.htmlTemplate === 'string') {
      if (fixed._style.htmlTemplate.indexOf('<style>') === -1 && fixed._style.htmlTemplate.indexOf('body {') !== -1) {
        if (typeof DEFAULT_HTML_TEMPLATE !== 'undefined') {
          fixed._style.htmlTemplate = DEFAULT_HTML_TEMPLATE;
        }
      }
    }
    if (fixed._style.latexTemplate && typeof fixed._style.latexTemplate === 'string') {
      if (fixed._style.latexTemplate.indexOf('\\documentclass') === -1) {
        if (typeof DEFAULT_LATEX_TEMPLATE !== 'undefined') {
          fixed._style.latexTemplate = DEFAULT_LATEX_TEMPLATE;
        }
      }
    }

    // 3. Section Definitions consistency (_sections)
    var ignoredKeys = ['basics', 'research_interests', '_templates', 'templates', '_hiddenFields', 'all_sections', 'labels', 'theme', 'sections', 'instances', '_style', '_sections'];
    var dataSectionKeys = Object.keys(fixed).filter(function(k) {
      return ignoredKeys.indexOf(k) === -1 && k.indexOf('_') !== 0;
    });

    fixed._sections = fixed._sections || {};
    if (!isObj(fixed._sections)) {
      fixed._sections = {};
    }

    // Add missing section metadata
    dataSectionKeys.forEach(function(k) {
      if (!fixed._sections[k] || !isObj(fixed._sections[k])) {
        var defaultTitle = k;
        if (typeof human === 'function') {
          defaultTitle = human(k);
        } else {
          defaultTitle = k.replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
        }
        fixed._sections[k] = { title: defaultTitle, include: true };
      }
    });

    // Remove orphaned metadata
    Object.keys(fixed._sections).forEach(function(k) {
      if (dataSectionKeys.indexOf(k) === -1) {
        delete fixed._sections[k];
      }
    });

    // 4. Section Data Consistency & Integrity
    dataSectionKeys.forEach(function(key) {
      var val = fixed[key];

      if (key === 'skills') {
        if (!isObj(val)) {
          fixed.skills = {};
        } else {
          Object.keys(val).forEach(function(cat) {
            var items = val[cat];
            if (!Array.isArray(items)) {
              if (typeof items === 'string') {
                val[cat] = items.split(',').map(function(s) { return { name: s.trim(), selected: true }; }).filter(function(x) { return x.name; });
              } else {
                val[cat] = [];
              }
            } else {
              val[cat] = items.map(function(it) {
                if (typeof it === 'string') {
                  return { name: it, selected: true };
                } else if (isObj(it)) {
                  var cleanIt = Object.assign({}, it);
                  if (typeof cleanIt.name !== 'string') cleanIt.name = String(cleanIt.name || '');
                  if (cleanIt.selected === undefined) cleanIt.selected = true;
                  else cleanIt.selected = !!cleanIt.selected;
                  return cleanIt;
                } else {
                  return { name: String(it || ''), selected: true };
                }
              });
            }
          });
        }
      } else {
        if (Array.isArray(val)) {
          fixed[key] = val.map(function(item) {
            if (!isObj(item)) {
              if (typeof item === 'string') {
                return { description: item, selected: true };
              } else {
                return { selected: true };
              }
            }
            var cleanItem = Object.assign({}, item);
            if (cleanItem.selected === undefined) {
              cleanItem.selected = true;
            } else {
              cleanItem.selected = !!cleanItem.selected;
            }
            if (cleanItem.courses && !Array.isArray(cleanItem.courses)) {
              if (typeof cleanItem.courses === 'string') {
                cleanItem.courses = cleanItem.courses.split(',').map(function(c) { return c.trim(); }).filter(Boolean);
              } else {
                cleanItem.courses = [];
              }
            }
            return cleanItem;
          });
        } else if (typeof val !== 'string') {
          fixed[key] = String(val);
        }
      }
    });

    // 5. CV Instances Consistency
    if (fixed.instances && isObj(fixed.instances)) {
      Object.keys(fixed.instances).forEach(function(instName) {
        var inst = fixed.instances[instName];
        if (!isObj(inst)) {
          delete fixed.instances[instName];
          return;
        }

        if (inst.overwrites && isObj(inst.overwrites)) {
          Object.keys(inst.overwrites).forEach(function(path) {
            if (!pathExists(fixed, path)) {
              delete inst.overwrites[path];
            }
          });
        }

        if (inst.visibility && isObj(inst.visibility)) {
          Object.keys(inst.visibility).forEach(function(path) {
            if (!pathExists(fixed, path)) {
              delete inst.visibility[path];
              return;
            }

            var masterVal = getValueByPath(fixed, path);
            var visVal = inst.visibility[path];
            if (Array.isArray(masterVal) && Array.isArray(visVal)) {
              if (visVal.length < masterVal.length) {
                while (visVal.length < masterVal.length) {
                  visVal.push(true);
                }
              } else if (visVal.length > masterVal.length) {
                inst.visibility[path] = visVal.slice(0, masterVal.length);
              }
            }
          });
        }

        if (inst.style && !isObj(inst.style)) {
          delete inst.style;
        }

        if (inst.sections && isObj(inst.sections)) {
          Object.keys(inst.sections).forEach(function(secKey) {
            if (dataSectionKeys.indexOf(secKey) === -1 && secKey !== 'basics') {
              delete inst.sections[secKey];
            }
          });
        }
      });
    }

    return fixed;
  }

  return {
    validate: validate,
    fix: fix
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CvIntegrityChecker: CvIntegrityChecker };
}
