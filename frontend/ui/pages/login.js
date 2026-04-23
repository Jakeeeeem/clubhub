import { Card } from '../components/card.js';
import { Button } from '../components/button.js';

/**
 * Login / Onboarding Page
 * @returns {string} HTML string
 */
export const LoginPage = () => {
    return `
        <div style="max-width: 450px; margin: 10vh auto; text-align: center;">
            <div style="margin-bottom: var(--space-8);">
                <h1 class="text-neon" style="font-size: 3rem; margin-bottom: var(--space-2);">ClubHub</h1>
                <p style="color: hsl(var(--muted));">Premium Sports Management</p>
            </div>

            ${Card({
                title: "Welcome Back",
                content: `
                    <form id="loginForm" onsubmit="event.preventDefault(); navigateTo('home');">
                        <div style="display: flex; flex-direction: column; gap: var(--space-4); text-align: left;">
                            <div class="form-group">
                                <label style="display: block; font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; margin-bottom: var(--space-2); opacity: 0.6;">Email Address</label>
                                <input type="email" placeholder="name@example.com" required style="width: 100%; padding: var(--space-4); background: hsla(0, 0%, 100%, 0.05); border: 1px solid hsl(var(--border)); border-radius: var(--radius-md); color: #fff; font-family: inherit;">
                            </div>
                            <div class="form-group">
                                <label style="display: block; font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; margin-bottom: var(--space-2); opacity: 0.6;">Password</label>
                                <input type="password" placeholder="••••••••" required style="width: 100%; padding: var(--space-4); background: hsla(0, 0%, 100%, 0.05); border: 1px solid hsl(var(--border)); border-radius: var(--radius-md); color: #fff; font-family: inherit;">
                            </div>
                            
                            <div style="margin-top: var(--space-4);">
                                ${Button({ text: "Sign In", variant: "primary", className: "btn-block", onClick: "console.log('Login attempt')" })}
                            </div>

                            <div style="margin-top: var(--space-4); text-align: center;">
                                <p style="font-size: var(--text-sm); color: hsl(var(--muted));">
                                    Don't have an account? <a href="#" style="color: hsl(var(--primary)); text-decoration: none; font-weight: 700;">Sign Up</a>
                                </p>
                            </div>
                        </div>
                    </form>
                `,
                glass: true
            })}
            
            <div style="margin-top: var(--space-6); display: flex; justify-content: center; gap: var(--space-4);">
                <span style="font-size: var(--text-xs); color: hsl(var(--muted)); cursor: pointer;">Forgot Password?</span>
                <span style="font-size: var(--text-xs); color: hsl(var(--muted));">|</span>
                <span style="font-size: var(--text-xs); color: hsl(var(--muted)); cursor: pointer;">Help Center</span>
            </div>
        </div>

        <style>
            .btn-block { width: 100%; }
            input:focus { outline: none; border-color: hsl(var(--primary)); box-shadow: 0 0 10px hsla(var(--primary-h), var(--primary-s), var(--primary-l), 0.2); }
        </style>
    `;
};
