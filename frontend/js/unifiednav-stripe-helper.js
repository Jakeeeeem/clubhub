/* Helper to handle Stripe Connect clicks with local fallbacks and toast messaging */
(function(){
  function showToast(message, type){
    // Prefer UnifiedNav notification if available
    if(window.UnifiedNav && typeof window.UnifiedNav.showNotification === 'function'){
      window.UnifiedNav.showNotification(message, type || 'info');
      return;
    }
    // Fallback: simple ephemeral toast
    try {
      const id = 'ch-toast';
      let el = document.getElementById(id);
      if(!el){
        el = document.createElement('div');
        el.id = id;
        el.style.position = 'fixed';
        el.style.right = '1rem';
        el.style.bottom = '1rem';
        el.style.zIndex = 99999;
        document.body.appendChild(el);
      }
      const t = document.createElement('div');
      t.textContent = message;
      t.style.background = type === 'error' ? '#b91c1c' : (type === 'success' ? '#16a34a' : '#111827');
      t.style.color = '#fff';
      t.style.padding = '0.8rem 1rem';
      t.style.marginTop = '0.5rem';
      t.style.borderRadius = '8px';
      t.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
      el.appendChild(t);
      setTimeout(()=>{ t.style.opacity = '0'; t.addEventListener('transitionend', ()=> t.remove()); }, 5000);
    }catch(e){ console.error('Toast failed', e); }
  }

  function handleStripeConnectClick(){
    // If running on localhost, prefer to notify dev instead of attempting live connect
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
    try {
      if(isLocal){
        showToast('Stripe connect is not available locally. The live connect will run on the deployed site.', 'error');
        return;
      }
      if(window.UnifiedNav && typeof window.UnifiedNav.manageStripeAccount === 'function'){
        window.UnifiedNav.manageStripeAccount();
        return;
      }
      // Fallback: attempt to open a known Stripe connect route if available
      if(window.location.pathname.indexOf('/admin') === 0){
        // best-effort fallback - open finances page where other connect buttons exist
        window.location.href = 'admin-finances.html';
        showToast('Opening finances page to continue Stripe connect...', 'info');
        return;
      }
      showToast('Stripe connect handler not found. Please check configuration.', 'error');
    } catch (e){
      // Suppress noisy console errors in local/dev environments
      showToast('Stripe connect failed locally. It will be reported on the live site.', 'error');
    }
  }

  // Expose globally for use in onclick attributes
  window.handleStripeConnectClick = handleStripeConnectClick;
  window.chShowToast = showToast;

  // Ensure UnifiedNav has safe fallbacks so inline onclicks won't throw
  try {
    window.UnifiedNav = window.UnifiedNav || {};
    if (!window.UnifiedNav.manageStripeAccount) window.UnifiedNav.manageStripeAccount = handleStripeConnectClick;
    if (!window.UnifiedNav.showNotification) window.UnifiedNav.showNotification = showToast;
  } catch (e) {
    // intentionally silent
  }
})();
