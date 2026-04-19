// Lightweight Groups module (demo/local-first)
(function(global){
  const STORAGE_KEY = 'clubhub_groups_v1';

  const defaultDemo = [
    {
      id: 'g-1',
      name: 'Weekend Warriors',
      description: 'Sunday morning training squad',
      members: [
        {id:'u-1', name:'Marcus Thompson', role:'admin'},
        {id:'u-2', name:'Liam Brown', role:'member'},
      ],
      createdAt: Date.now()
    },
    {
      id: 'g-2',
      name: 'Youth Tigers',
      description: 'Under 16 team',
      members: [
        {id:'u-3', name:'Sarah Davies', role:'organizer'},
        {id:'u-4', name:'Jamie Lee', role:'member'},
      ],
      createdAt: Date.now()
    }
  ];

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return seed();
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Groups.load failed, reseeding demo', e);
      return seed();
    }
  }

  function seed() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultDemo));
    return defaultDemo;
  }

  function save(groups) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  }

  function createGroup({name, description}){
    const groups = load();
    const id = 'g-' + Math.random().toString(36).slice(2,9);
    const g = {id, name, description, members:[], createdAt: Date.now()};
    groups.push(g);
    save(groups);
    return g;
  }

  function getGroup(id){
    const groups = load();
    return groups.find(g=>g.id===id) || null;
  }

  function addMember(groupId, member){
    const groups = load();
    const g = groups.find(x=>x.id===groupId);
    if(!g) throw new Error('group not found');
    g.members.push(member);
    save(groups);
    return g;
  }

  function removeMember(groupId, memberId){
    const groups = load();
    const g = groups.find(x=>x.id===groupId);
    if(!g) throw new Error('group not found');
    g.members = g.members.filter(m=>m.id!==memberId);
    save(groups);
    return g;
  }

  function updateGroup(id, patch){
    const groups = load();
    const g = groups.find(x=>x.id===id);
    if(!g) throw new Error('group not found');
    Object.assign(g, patch);
    save(groups);
    return g;
  }

  // Simple invite link generator (stub)
  function generateInviteLink(groupId){
    return `${window.location.origin}/frontend/group-dashboard.html?invite=${groupId}&code=${Math.random().toString(36).slice(2,8)}`;
  }

  // Small renderer for switcher used by UnifiedNav
  const GroupSwitcher = {
    render(container){
      const groups = load();
      const active = localStorage.getItem('activeGroupId') || (groups[0] && groups[0].id);
      if(!container) return;
      container.innerHTML = groups.map(g=>`<button class="group-switch-item" data-id="${g.id}" style="background:transparent;border:none;color:white;padding:8px 10px;border-radius:8px;" ${g.id===active? 'aria-current="true"' : ''}>${g.name}</button>`).join('');
      container.querySelectorAll('.group-switch-item').forEach(btn=>{
        btn.onclick = (e)=>{
          const id = btn.getAttribute('data-id');
          localStorage.setItem('activeGroupId', id);
          if(window.UnifiedNav && typeof window.UnifiedNav.renderProfileSwitcher === 'function'){
            // small hook to refresh header
            window.UnifiedNav.renderProfileSwitcher();
          }
          // navigate to group dashboard
          window.location.href = 'group-dashboard.html?group=' + id;
        };
      });
    },
    getActive(){
      return localStorage.getItem('activeGroupId') || (load()[0] && load()[0].id);
    },
    create: createGroup,
    list: load,
    get: getGroup,
    addMember,
    removeMember,
    inviteLink: generateInviteLink
  };

  global.Groups = {
    load, save, createGroup, getGroup, addMember, removeMember, updateGroup, generateInviteLink, GroupSwitcher
  };
})(window);
