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