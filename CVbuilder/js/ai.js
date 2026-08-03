/**
 * CVbuilder AI Engine
 * Supports 100% offline local LLMs via Ollama (http://localhost:11434)
 * and Google Gemini Flash via free Google AI Studio API keys (BYOK).
 */

var AIClient = (function() {

  var DEFAULT_SYSTEM_PROMPT = "You are an expert career consultant, resume writer, and ATS optimization specialist. Help candidates craft compelling, professional, concise, and impact-driven resumes.";

  function getSettings() {
    var raw = localStorage.getItem('cvbuilder_ai_settings');
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (!parsed.systemPrompt) parsed.systemPrompt = DEFAULT_SYSTEM_PROMPT;
        return parsed;
      } catch(e) {}
    }
    return {
      provider: 'ollama', // 'ollama' or 'gemini'
      ollamaEndpoint: 'http://localhost:11434',
      ollamaModel: 'llama3:latest',
      geminiApiKey: '',
      geminiModel: 'gemini-2.5-flash',
      systemPrompt: DEFAULT_SYSTEM_PROMPT
    };
  }

  function saveSettings(settingsObj) {
    localStorage.setItem('cvbuilder_ai_settings', JSON.stringify(settingsObj));
    if (typeof updateAiUiState === 'function') updateAiUiState();
  }

  function isConfigured() {
    var s = getSettings();
    if (s.provider === 'gemini') {
      return !!(s.geminiApiKey && s.geminiApiKey.trim());
    } else {
      return !!(s.ollamaEndpoint && s.ollamaEndpoint.trim());
    }
  }

  async function callOllama(s, promptText, systemPrompt) {
    var baseUrl = (s.ollamaEndpoint || 'http://localhost:11434').replace(/\/$/, '');
    var modelName = s.ollamaModel || 'llama3:latest';
    var sysPrompt = systemPrompt || s.systemPrompt || DEFAULT_SYSTEM_PROMPT;

    var endpoints = [
      {
        url: baseUrl + '/api/chat',
        payload: {
          model: modelName,
          messages: [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: promptText }
          ],
          stream: false
        },
        parse: function(d) { return d && d.message && d.message.content; }
      },
      {
        url: baseUrl + '/v1/chat/completions',
        payload: {
          model: modelName,
          messages: [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: promptText }
          ],
          stream: false
        },
        parse: function(d) { return d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content; }
      }
    ];

    var lastErr = null;

    for (var i = 0; i < endpoints.length; i++) {
      var ep = endpoints[i];
      try {
        var res = await fetch(ep.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ep.payload)
        });

        if (res.ok) {
          var data = await res.json();
          var outStr = ep.parse(data);
          if (outStr) return String(outStr).trim();
        } else if (res.status === 404) {
          continue;
        } else {
          var errText = await res.text().catch(function(){ return ''; });
          throw new Error('Ollama Error (' + res.status + '): ' + (errText || res.statusText));
        }
      } catch (err) {
        lastErr = err;
        if (err.name === 'TypeError' || (err.message && err.message.indexOf('fetch') !== -1)) {
          throw new Error('Failed to connect to Ollama at ' + baseUrl + '. If Ollama is running, browser CORS is blocking the connection. Set environment variable OLLAMA_ORIGINS="*" before running Ollama.');
        }
      }
    }

    throw lastErr || new Error('Could not connect to Ollama model ' + modelName + ' at ' + baseUrl);
  }

  async function callLLM(promptText, overrideSystemPrompt) {
    var s = getSettings();
    var sysPrompt = overrideSystemPrompt || s.systemPrompt || DEFAULT_SYSTEM_PROMPT;

    if (s.provider === 'gemini') {
      if (!s.geminiApiKey) throw new Error("Gemini API Key is missing. Please configure it in AI Settings.");
      var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + (s.geminiModel || 'gemini-2.5-flash') + ':generateContent?key=' + encodeURIComponent(s.geminiApiKey.trim());
      
      var payload = {
        systemInstruction: {
          parts: [{ text: sysPrompt }]
        },
        contents: [
          {
            parts: [
              { text: promptText }
            ]
          }
        ]
      };

      try {
        var res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          var errText = await res.text();
          throw new Error('Gemini API Error (' + res.status + '): ' + errText.substring(0, 150));
        }

        var data = await res.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
          return data.candidates[0].content.parts.map(function(p){ return p.text; }).join('\n').trim();
        }
        throw new Error("Unexpected response structure from Gemini API");
      } catch (err) {
        if (err.name === 'TypeError' || (err.message && err.message.indexOf('fetch') !== -1)) {
          throw new Error("Network error connecting to Gemini API. Check your internet connection.");
        }
        throw err;
      }

    } else {
      return await callOllama(s, promptText, sysPrompt);
    }
  }

  async function enhanceBullet(text) {
    var prompt = "Rewrite the following resume entry into a high-impact, action-driven bullet point with metrics or clear deliverables:\n\n\"" + text + "\"";
    return await callLLM(prompt);
  }

  async function fixGrammar(text) {
    var prompt = "Correct any spelling, punctuation, or grammatical errors in the following text while preserving formatting:\n\n\"" + text + "\"";
    return await callLLM(prompt);
  }

  async function translateContent(text, targetLang) {
    var prompt = "Translate the following resume text into " + (targetLang === 'es' ? 'Spanish' : 'English') + " accurately:\n\n\"" + text + "\"";
    return await callLLM(prompt);
  }

  async function generateCritiqueQuestions(cvData) {
    var prompt = "Analyze the following curriculum vitae JSON data:\n" + JSON.stringify(cvData) + "\n\nIdentify 3 specific, weak, or vague bullet points or sections, and ask the user targeted interview questions to help extract missing metrics, achievements, or numbers to make their CV stand out.";
    return await callLLM(prompt, "You are a professional executive resume auditor conducting a friendly interview.");
  }

  async function testConnection(customSettings) {
    var s = customSettings || getSettings();
    var testPrompt = "Ping. Reply with one word: OK.";

    if (s.provider === 'gemini') {
      if (!s.geminiApiKey || !s.geminiApiKey.trim()) {
        throw new Error("Gemini API Key is empty. Please enter your API key.");
      }
      var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + (s.geminiModel || 'gemini-2.5-flash') + ':generateContent?key=' + encodeURIComponent(s.geminiApiKey.trim());
      var payload = {
        contents: [{ parts: [{ text: testPrompt }] }]
      };
      try {
        var res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          var errText = await res.text();
          throw new Error('Gemini API Error (' + res.status + '): ' + errText.substring(0, 150));
        }
        return "Connected successfully to Google Gemini Flash API!";
      } catch (err) {
        if (err.name === 'TypeError' || (err.message && err.message.indexOf('fetch') !== -1)) {
          throw new Error("Network error connecting to Gemini API. Check your internet connection.");
        }
        throw err;
      }

    } else {
      var resStr = await callOllama(s, testPrompt, "You are a test assistant.");
      return "Connected successfully to Ollama Local LLM (" + (s.ollamaModel || 'llama3:latest') + ")!";
    }
  }

  return {
    getSettings: getSettings,
    saveSettings: saveSettings,
    isConfigured: isConfigured,
    testConnection: testConnection,
    callLLM: callLLM,
    enhanceBullet: enhanceBullet,
    fixGrammar: fixGrammar,
    translateContent: translateContent,
    generateCritiqueQuestions: generateCritiqueQuestions
  };

})();
