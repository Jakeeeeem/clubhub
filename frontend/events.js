// Lightweight Events module with RSVP support (demo/local-first)
(function(global){
  const STORAGE_KEY = 'clubhub_events_v1';

  function load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return [];
      return JSON.parse(raw);
    }catch(e){
      console.warn('Events.load failed', e);
      return [];
    }
  }

  function save(events){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }

  function createEvent({groupId, title, description, startsAt, endsAt, recurring=null}){
    const events = load();
    const id = 'e-' + Math.random().toString(36).slice(2,9);
    const ev = {id, groupId, title, description, startsAt, endsAt, recurring, rsvps:[], createdAt: Date.now()};
    events.push(ev);
    save(events);
    return ev;
  }

  function getEventsForGroup(groupId){
    return load().filter(e=>e.groupId===groupId).sort((a,b)=>a.startsAt - b.startsAt);
  }

  function getEvent(id){
    return load().find(e=>e.id===id) || null;
  }

  function rsvp(eventId, userId, response){
    // response: 'yes'|'no'|'maybe'
    const events = load();
    const ev = events.find(e=>e.id===eventId);
    if(!ev) throw new Error('event not found');
    ev.rsvps = ev.rsvps.filter(r=>r.userId!==userId);
    ev.rsvps.push({userId, response, updatedAt: Date.now()});
    save(events);
    return ev;
  }

  function attendanceHistoryForUser(userId){
    const events = load();
    return events.filter(e=>e.rsvps.find(r=>r.userId===userId)).map(e=>({eventId:e.id,title:e.title, response: e.rsvps.find(r=>r.userId===userId).response, startsAt: e.startsAt}));
  }

  // recurring handling stub: expand occurrences for next N instances
  function expandRecurring(event, count=5){
    if(!event.recurring) return [event];
    // simple daily/weekly/monthly rule expected: {freq:'weekly', interval:1}
    const occ = [];
    let start = new Date(event.startsAt);
    for(let i=0;i<count;i++){
      occ.push(Object.assign({}, event, {instanceOf:event.id, startsAt: start.getTime()}));
      if(event.recurring.freq==='weekly') start.setDate(start.getDate() + 7 * (event.recurring.interval || 1));
      else if(event.recurring.freq==='daily') start.setDate(start.getDate() + 1 * (event.recurring.interval || 1));
      else start.setMonth(start.getMonth() + (event.recurring.interval || 1));
    }
    return occ;
  }

  global.Events = { load, save, createEvent, getEventsForGroup, getEvent, rsvp, attendanceHistoryForUser, expandRecurring };
})(window);
