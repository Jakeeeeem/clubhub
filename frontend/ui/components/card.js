/**
 * Card Component
 * @param {Object} props
 * @param {string} props.title - The card title
 * @param {string} props.content - The card content (HTML)
 * @param {string} [props.className=''] - Additional classes
 * @param {boolean} [props.glass=false] - Whether to use glassmorphism
 * @returns {string} HTML string
 */
export const Card = ({ title, content, className = '', glass = false }) => {
    return `
        <div class="card ${glass ? 'glass' : ''} ${className}">
            ${title ? `<h3 style="margin-bottom: var(--space-4);">${title}</h3>` : ''}
            <div class="card-content">
                ${content}
            </div>
        </div>
    `;
};
