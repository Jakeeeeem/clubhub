/**
 * Button Component
 * @param {Object} props
 * @param {string} props.text - The button label
 * @param {string} [props.variant='primary'] - 'primary' or 'secondary'
 * @param {string} [props.className=''] - Additional classes
 * @param {string} [props.onClick=''] - Click handler (string or function name)
 * @returns {string} HTML string
 */
export const Button = ({ text, variant = 'primary', className = '', onClick = '' }) => {
    return `
        <button 
            class="btn btn-${variant} ${className}"
            ${onClick ? `onclick="${onClick}"` : ''}
        >
            ${text}
        </button>
    `;
};
