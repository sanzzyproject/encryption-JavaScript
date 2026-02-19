import axios from 'axios';
import * as cheerio from 'cheerio';
import vm from 'vm';

export default async function handler(req, res) {
  // CORS Handling
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ success: false, message: 'Input code is required' });
  }

  try {
    // Simulasi request sesuai script asli
    await axios.get('https://codebeautify.org/javascript-obfuscator', {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });

    const sandbox = {
      window: {},
      document: {
        getElementById: function() { return { value: '', innerText: '', innerHTML: '' }; }
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
      result: sandbox.obfuscatedResult 
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
