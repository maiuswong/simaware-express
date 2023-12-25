codes = {ALPHA: 'A', BRAVO: 'B', CHARLIE: 'C', DELTA: 'D', ECHO: 'E', FOXTROT: 'F', GOLF: 'G', HOTEL: 'H', INDIA: 'I', JULIET: 'J', KILO: 'K', LIMA: 'L', MIKE: 'M', NOVEMBER: 'N', OSCAR: 'O', PAPA: 'P', QUEBEC: 'Q', ROMEO: 'R', SIERRA: 'S', TANGO: 'T', UNIFORM: 'U', VICTOR: 'V', WHISKEY: 'W', XRAY: 'X', YANKEE: 'Y', ZULU: 'Z'};

function getAtisCode(atis, icao)
{
  atis_exploded = atis.replace('.', ' ').replace(',', ' ').toUpperCase().split(' ');
  delete code;
  $.each(atis_exploded, function(idx, char)
  {
    if(char == 'INFO' || char == 'INFORMATION'
       || (char == 'ATIS' && atis_exploded[idx-1] == icao && atis_exploded[idx+1] != 'INFO' && atis_exploded[idx+1] != 'INFORMATION'))
    {
      code = atis_exploded[idx + 1];
      return false;
    }
  });
  if(typeof code == 'undefined')
  {
    $.each(atis_exploded, function(idx, char)
    {
      if(char == icao)
      {
        code = atis_exploded[idx + 1];
        return false;
      }
    })
  }
  if(typeof code != 'undefined')
  {
    if(code.length == 1)
    {
      return code;
    }
    else
    {
      return convertToLetter(code);
    }
  }
  else
  {
    return '-';
  }
}

function convertToLetter(str)
{
  if(typeof codes[str] != 'undefined')
  {
    return codes[str];
  }
  else
  {
    return '-';
  }
}

function getAtisRwy(atis)
{
  var keys = ['RWY IN USE', 'RWYS IN USE', 'RUNWAY IN USE', 'RUNWAYS IN USE', 'RUNWAY', 'RWY', 'ILS', 'VISUAL', 'APCHS', 'APCH', 'APPR', 'LANDING'];
  var rwys = [];
  var numbers = {'ZERO': '0', 'ONE': '1', 'TWO': '2', 'THREE': '3', 'FOUR': '4', 'FIVE': '5', 'SIX': '6', 'SEVEN': '7', 'EIGHT': '8', 'NINE': '9'};
  for(var i in keys)
  {
    var key = keys[i];
    if(atis.includes(key))
    {
      const DIGIT_WORDS = {
        zero: '0',
        one: '1',
        two: '2',
        three: '3',
        four: '4',
        five: '5',
        six: '6',
        seven: '7',
        eight: '8',
        niner: '9',
      };
    
      const regex = new RegExp('\\b(' + Object.keys(DIGIT_WORDS).join('|') + ')\\b', 'ig');
      atis = atis.replace(regex, match => DIGIT_WORDS[match.toLowerCase()]).replace(/[,.]/g, "").replace(/RIGHT/gi, 'R').replace(/LEFT/gi, 'L').replace(/\b(\d)\s+(\d)\s+([RL])\b/gi, '$1$2$3').replace(/\b(\d)\s+([RL])\b/gi, '$1$2');
      var [first, ...spl] = atis.split(key);
      var intr = spl.join(' ').split(' ');
      for(j in intr)
      {
        if(j > 15)
        {
          break;
        }
        if(intr[j].match(/^(0?[1-9]|[1-2]\d|3[0-6])[LCR]?$/))
        {
          rwys.push(intr[j]);
        }
      }
      break;
    }
  }
  return rwys;
}