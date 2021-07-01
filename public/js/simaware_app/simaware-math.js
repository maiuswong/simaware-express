var green = '#13b955';
var blue = '#009cdc';
var yellow = '#efa31d';
var red = '#da292e';

// Returns the percentage of the flight
function getElapsedWidth(flight)
{
  return (getDfd(flight) / getTotalDistance(flight) - $('#flights-progressbar-plane').width() / 2 / $('#flights-progressbar').width()) * 100;
}

// Pctg of infoflight
function getInfoElapsedWidth(flight)
{
  return (getDfd(flight) / getTotalDistance(flight)) * 100 - 6;
}

// Returns the heading to latlon2 from latlon1
function getRhumbLineBearing(lat1, lon1, lat2, lon2)
{
   //difference in longitudinal coordinates
   dLon = deg2rad(lon2) - deg2rad(lon1);

   //difference in the phi of latitudinal coordinates
   dPhi = Math.log(Math.tan(deg2rad(lat2) / 2 + Math.PI / 4) / Math.tan(deg2rad(lat1) / 2 + Math.PI / 4));

   //we need to recalculate dLon if it is greater than pi
   if(Math.abs(dLon) > Math.PI)
   {
      if(dLon > 0) {
         dLon = (2 * Math.PI - dLon) * -1;
      }
      else {
         dLon = 2 * Math.PI + dLon;
      }
   }
   //return the angle, normalized
   return (rad2deg(Math.atan2(dLon, dPhi)) + 360) % 360;
}

// Degree to radian
function deg2rad (angle)
{
  return angle * 0.017453292519943295 // (angle / 180) * Math.PI;
}

// Radian to degree
function rad2deg (angle)
{
  return angle / 0.017453292519943295 // (angle / 180) * Math.PI;
}

// Get distance to go
function getDtg(flight)
{
  var arr = airports[flight.arr];
  if(arr)
    dtg = distance(Number(flight.lat), Number(flight.lon), Number(arr.lat), Number(arr.lon));
  else
    dtg = 0;
  return dtg;
}

// Get distance from destination
function getDfd(flight)
{
  var dep = airports[flight.dep];
  if(dep)
    dtg = distance(Number(flight.lat), Number(flight.lon), Number(dep.lat), Number(dep.lon));
  else
    dtg = 0;
  return dtg;
}

function getStatus(flight)
{
  ret = {};
  if(getDfd(flight) < 40)
  {
    if(flight.gndspd == 0)
    {
      ret.status = 'Pre-Departure';
      ret.color = blue;
      ret.blink = false;
    }
    else if(flight.gndspd < 50)
    {
      ret.status = 'Left Gate';
      ret.color = blue;
      ret.blink = true;
    }
    else
    {
      ret.status = 'Departed';
      ret.color = blue;
      ret.blink = true;
    }
  }
  else if(getDtg(flight) < 40)
  {
    if(flight.gndspd == 0)
    {
      ret.status = 'Arrived';
      ret.color = green;
      ret.blink = false;
    }
    else if(flight.gndspd < 50)
    {
      ret.status = 'Landed';
      ret.color = yellow;
      ret.blink = false;
    }
    else
    {
      ret.status = 'Arriving Shortly';
      ret.color = yellow;
      ret.blink = true;
    }
  }
  else
  {
    ret.status = 'Enroute';
    ret.color = green;
    ret.blink = false;
  }
  return ret;
}

// Get total distance 
function getTotalDistance(flight)
{
  arr = airports[flight.arr];
  dep = airports[flight.dep];
  if(dep && arr)
    dtg = distance(Number(flight.lat), Number(flight.lon), Number(arr.lat), Number(arr.lon)) + distance(Number(flight.lat), Number(flight.lon), Number(dep.lat), Number(dep.lon));
  else
    dtg = 50;
  return dtg;
}

// Base function for distance calculations
function distance(lat1, lon1, lat2, lon2)
{
  r = 3440.1;
  lat1 = deg2rad(lat1);
  lon1 = deg2rad(lon1);
  lat2 = deg2rad(lat2);
  lon2 = deg2rad(lon2);
  lonDelta = lon2 - lon1;
  a = Math.pow(Math.cos(lat2) * Math.sin(lonDelta) , 2) + Math.pow(Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lonDelta) , 2);
  b = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(lonDelta);
  angle = Math.atan2(Math.sqrt(a) , b);
  return angle * r;
}