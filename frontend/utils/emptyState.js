// utils/emptyState.js
// Renders a premium glassmorphism empty-state component.
//
// Usage:
//   renderEmptyState('No teams yet.')          — simple message
//   renderEmptyState('No teams yet.', '🏆')   — with custom icon
//   renderEmptyState('Heading', 'Subtitle text here.', '🏆')  — title + subtitle
//
window.renderEmptyState = function (messageOrTitle, iconOrSubtitle, icon) {
  let titleHtml = '';
  let subtitleHtml = '';
  let iconChar = '📄';

  if (icon !== undefined) {
    // 3-arg form: (title, subtitle, icon)
    iconChar = icon || '📄';
    titleHtml = `<strong class="empty-title">${messageOrTitle}</strong>`;
    subtitleHtml = iconOrSubtitle ? `<p>${iconOrSubtitle}</p>` : '';
  } else if (typeof iconOrSubtitle === 'string' && /^\p{Emoji}/u.test(iconOrSubtitle)) {
    // 2-arg form where second arg is an emoji → (message, icon)
    iconChar = iconOrSubtitle;
    subtitleHtml = `<p>${messageOrTitle}</p>`;
  } else {
    // fallback
    iconChar = iconOrSubtitle || '📄';
    subtitleHtml = `<p>${messageOrTitle}</p>`;
  }

  return `
    <div class="empty-state">
      <i aria-hidden="true">${iconChar}</i>
      ${titleHtml}
      ${subtitleHtml}
    </div>
  `;
};
