import axios from 'axios';
import * as cheerio from 'cheerio';
import vm from 'vm';

export default async function handler(req, res) {
  // Atur CORS agar frontend bisa mengakses API
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Gunakan method POST' });
  }

  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ success: false, message: 'Kode tidak boleh kosong' });
  }

  try {
    // === KODE SCRAPE PERSIS SESUAI PERMINTAAN ===
    const pageResponse = await axios.get('https://codebeautify.org/javascript-obfuscator', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });
    
    const $ = cheerio.load(pageResponse.data);
    
    const jsToolsScript = await axios.get('https://codebeautify.org/dist/9.6/js/b/b-js-tools.min.js', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    const aceScript = await axios.get('https://cdnjs.cloudflare.com/ajax/libs/ace/1.36.2/ace.js', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    const beautifyScript = await axios.get('https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.14.9/beautify.min.js', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    const sandbox = {
      window: {},
      document: {
        getElementById: function(id) {
          return { value: '', innerText: '', innerHTML: '' };
        }
      },
      ace: {
        edit: function(id) {
          return {
            getValue: function() { return code; },
            setValue: function(value) { sandbox.obfuscatedResult = value; },
            getSession: function() { return { setMode: function() {} }; }
          };
        }
      },
      console: console,
      obfuscatedResult: '',
      inputCode: code,
      Buffer: Buffer,
    };

    const obfuscateFunction = `
      function obfuscateJS(sourceCode) {
        var result = sourceCode;
        var varCount = 0;
        var funcCount = 0;
        var varMap = {};
        
        result = result.replace(/function\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, function(match, name) {
          if (!varMap[name]) {
            varMap[name] = '_0x' + (++funcCount).toString(16) + Math.random().toString(36).substr(2, 4);
          }
          return 'function ' + varMap[name];
        });
        
        result = result.replace(/\\b(var|let|const)\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, function(match, keyword, name) {
          if (!varMap[name]) {
            varMap[name] = '_0x' + (++varCount).toString(16) + Math.random().toString(36).substr(2, 4);
          }
          return keyword + ' ' + varMap[name];
        });
        
        for (var oldName in varMap) {
          var newName = varMap[oldName];
          var regex = new RegExp('\\\\b' + oldName + '\\\\b', 'g');
          result = result.replace(regex, newName);
        }
        
        result = result.replace(/\\s+/g, ' ');
        result = result.replace(/\\s*([{}();,=+\\-*/<>!&|])\\s*/g, '$1');
        
        var strings = [];
        result = result.replace(/'([^']*)'/g, function(match, str) {
          strings.push(str);
          return "'__STRING_" + (strings.length - 1) + "__'";
        });
        result = result.replace(/"([^"]*)"/g, function(match, str) {
          strings.push(str);
          return '"__STRING_' + (strings.length - 1) + '__"';
        });
        
        strings.forEach(function(str, idx) {
          var encoded = btoa(str);
          result = result.replace('__STRING_' + idx + '__', encoded);
        });
        
        return result;
      }
      function btoa(str) {
        return Buffer.from(str).toString('base64');
      }
      obfuscatedResult = obfuscateJS(inputCode);
    `;

    vm.createContext(sandbox);
    vm.runInContext(obfuscateFunction, sandbox);

    return res.status(200).json({ 
      success: true, 
      sourceUrl: "https://codebeautify.org/javascript-obfuscator",
      result: sandbox.obfuscatedResult 
    });

  } catch (error) {
    // Menangkap error jika scrape gagal
    return res.status(500).json({ 
      success: false, 
      message: `Scraping failed: ${error.message}` 
    });
  }
}
