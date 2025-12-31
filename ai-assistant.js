// ==============================================
// ADVANCED AI ASSISTANT - MTA & SAMP
// GROQ VERSION - 100% WORKING WITH YOUR KEY
// ==============================================

// GROQ API Key - YOUR WORKING KEY
const GROQ_API_KEY = "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";

let currentGame = 'mta';
let isGenerating = false;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log("AI Assistant loaded with Groq API");
    
    // Game selection
    const gameButtons = document.querySelectorAll('.game-select-btn');
    gameButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            gameButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentGame = this.dataset.game;
            updateGameUI();
        });
    });
    
    updateGameUI();
});

// Update UI based on game
function updateGameUI() {
    const gameTitle = document.getElementById('gameTitle');
    const gameIcon = document.getElementById('gameIcon');
    const examples = document.getElementById('aiExamples');
    
    if (currentGame === 'mta') {
        gameTitle.textContent = 'MTA:SA Lua Script Generator';
        gameIcon.className = 'fas fa-gamepad';
        examples.innerHTML = `
            <div class="example-item" onclick="fillExample(this)">
                <span class="example-badge">MTA</span>
                <span>/heal command for admins</span>
            </div>
            <div class="example-item" onclick="fillExample(this)">
                <span class="example-badge">MTA</span>
                <span>Car dealership system with GUI</span>
            </div>
            <div class="example-item" onclick="fillExample(this)">
                <span class="example-badge">MTA</span>
                <span>Login/register with MySQL</span>
            </div>
        `;
    } else {
        gameTitle.textContent = 'SA-MP Pawn Script Generator';
        gameIcon.className = 'fas fa-server';
        examples.innerHTML = `
            <div class="example-item" onclick="fillExample(this)">
                <span class="example-badge" style="background:#9b59b6;">SAMP</span>
                <span>/heal command for admins</span>
            </div>
            <div class="example-item" onclick="fillExample(this)">
                <span class="example-badge" style="background:#9b59b6;">SAMP</span>
                <span>Vehicle dealership system</span>
            </div>
            <div class="example-item" onclick="fillExample(this)">
                <span class="example-badge" style="background:#9b59b6;">SAMP</span>
                <span>House system with MySQL</span>
            </div>
        `;
    }
}

// Main AI generation function
window.generateMTAscript = async function() {
    if (isGenerating) {
        showCoolNotification('⏳ AI is already generating...', 'info');
        return;
    }
    
    const input = document.getElementById('aiDescription');
    const output = document.getElementById('aiCodeOutput');
    
    if (!input || !input.value.trim()) {
        showCoolNotification('📝 Please describe what you need!', 'info');
        return;
    }
    
    const userRequest = input.value.trim();
    if (userRequest.length < 5) {
        showCoolNotification('📝 Please be more descriptive (min 5 characters)', 'info');
        return;
    }
    
    if (userRequest.length > 1000) {
        showCoolNotification('📝 Description too long (max 1000 characters)', 'info');
        return;
    }
    
    isGenerating = true;
    
    // Show cool loading animation
    output.innerHTML = createLoadingScreen();
    output.style.display = 'block';
    
    // Add typing animation effect
    const loadingText = output.querySelector('.loading-text');
    let dots = 0;
    const dotInterval = setInterval(() => {
        dots = (dots + 1) % 4;
        loadingText.textContent = 'AI is generating your code' + '.'.repeat(dots);
    }, 500);
    
    try {
        console.log("Generating AI code for:", userRequest.substring(0, 50) + "...");
        const aiResponse = await callAI(userRequest, currentGame);
        
        clearInterval(dotInterval);
        output.innerHTML = createResultScreen(aiResponse);
        
        // Scroll to result
        output.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Show success notification
        showCoolNotification('✨ Code Generated Successfully!', 'success');
        
    } catch (error) {
        clearInterval(dotInterval);
        console.error("AI Generation Error:", error);
        output.innerHTML = createErrorScreen(error);
        showCoolNotification('❌ ' + error.message, 'error');
    } finally {
        isGenerating = false;
    }
};

// Call Groq API - 100% WORKING
async function callAI(userPrompt, game) {
    if (!GROQ_API_KEY || GROQ_API_KEY.length < 10) {
        throw new Error('AI service configuration error. Contact admin.');
    }
    
    // SIMPLER SYSTEM PROMPT
    const systemPrompt = game === 'mta' 
        ? `You are an MTA:SA Lua expert. Generate working Lua code.
           Format: Start with "🔥 Generated by Louay Zaid's AI Assistant 🔥"
           Then put code in \`\`\`lua blocks.
           Make it simple and working.` 
        : `You are an SA-MP Pawn expert. Generate working Pawn code.
           Format: Start with "🔥 Generated by Louay Zaid's AI Assistant 🔥"
           Then put code in \`\`\`pawn blocks.
           Make it simple and working.`;
    
    try {
        console.log("Calling Groq API with prompt:", userPrompt.substring(0, 50));
        
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama3-70b-8192",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                max_tokens: 2000,
                temperature: 0.7
            })
        });
        
        console.log("Groq Response Status:", response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Groq API Error:", response.status, errorText);
            
            if (response.status === 400) {
                // Try with even simpler model
                return await callAIFallback(userPrompt, game);
            }
            throw new Error('Invalid request. Try simpler description.');
        }
        
        const data = await response.json();
        console.log("Groq Response received");
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid AI response');
        }
        
        return data.choices[0].message.content;
        
    } catch (error) {
        console.error("API call failed:", error);
        throw error;
    }
}

// FALLBACK FUNCTION
async function callAIFallback(userPrompt, game) {
    console.log("Using fallback function");
    
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "mixtral-8x7b-32768",  // Alternative model
            messages: [
                { 
                    role: "system", 
                    content: `Generate ${game === 'mta' ? 'MTA Lua' : 'SA-MP Pawn'} code.`
                },
                { role: "user", content: userPrompt }
            ],
            max_tokens: 1500,
            temperature: 0.7
        })
    });
    
    if (!response.ok) throw new Error('Fallback also failed');
    
    const data = await response.json();
    return data.choices[0].message.content;
}

// UI Components
function createLoadingScreen() {
    return `
    <div class="ai-loading-screen">
        <div class="loading-sparkle">
            <div class="sparkle"></div>
            <div class="sparkle"></div>
            <div class="sparkle"></div>
        </div>
        <div class="loading-signature">
            <div class="signature-line"></div>
            <div class="signature-name">Louay Zaid</div>
            <div class="signature-line"></div>
        </div>
        <div class="loading-text">AI is generating your code</div>
        <div class="loading-subtext">Powered By Groq AI • Using Llama 3 70B • Fast & Free</div>
    </div>`;
}

function createResultScreen(aiResponse) {
    let formattedResponse = aiResponse;
    
    // Format code blocks
    formattedResponse = formattedResponse.replace(/```(\w+)?\n([\s\S]*?)```/g, 
        '<div class="code-block"><div class="code-header">$1</div><pre class="language-$1">$2</pre></div>');
    
    // Format inline code
    formattedResponse = formattedResponse.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Ensure response starts with signature
    if (!formattedResponse.includes('🔥 Generated by')) {
        formattedResponse = `🔥 Generated by Louay Zaid's AI Assistant 🔥\n\n${formattedResponse}`;
    }
    
    return `
    <div class="ai-result-screen">
        <div class="result-header">
            <div class="game-badge ${currentGame}">
                <i class="fas ${currentGame === 'mta' ? 'fa-gamepad' : 'fa-server'}"></i>
                ${currentGame.toUpperCase()}
            </div>
            <div class="signature-watermark">
                <i class="fas fa-bolt"></i> Powered by Groq AI • Llama 3 70B
            </div>
        </div>
        
        <div class="generated-content">
            ${formattedResponse}
        </div>
        
        <div class="result-actions">
            <button onclick="copyAICode()" class="action-btn copy-btn">
                <i class="fas fa-copy"></i> Copy Code
            </button>
            <button onclick="useInUpload()" class="action-btn upload-btn">
                <i class="fas fa-upload"></i> Use in Upload
            </button>
            <button onclick="generateMTAscript()" class="action-btn regenerate-btn">
                <i class="fas fa-redo"></i> Generate Again
            </button>
        </div>
        
        <div class="result-footer">
            <div class="powered-by">
                <i class="fas fa-key"></i> API: Groq • 
                <i class="fas fa-brain"></i> Model: Llama 3 70B • 
                <i class="fas fa-rocket"></i> Ultra Fast
            </div>
        </div>
    </div>`;
}

function createErrorScreen(error) {
    return `
    <div class="ai-error-screen">
        <div class="error-icon">
            <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3>AI Generation Failed</h3>
        <div class="error-message">${error.message}</div>
        
        <div class="error-solutions">
            <h4><i class="fas fa-wrench"></i> Quick Solutions:</h4>
            <ul style="text-align: left; color: #a0a0d0; padding-left: 20px;">
                <li><strong>Try a simpler description</strong> (e.g., "/heal command")</li>
                <li><strong>Wait 30 seconds</strong> and try again</li>
                <li><strong>Check internet connection</strong></li>
                <li><strong>Working examples:</strong>
                    <ul style="margin-left: 20px; margin-top: 5px;">
                        <li><code>/heal command for admins</code></li>
                        <li><code>vehicle spawn menu</code></li>
                        <li><code>login system with MySQL</code></li>
                    </ul>
                </li>
            </ul>
        </div>
        
        <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
            <button onclick="generateMTAscript()" class="error-btn" style="padding: 12px 25px; background: linear-gradient(90deg, #6a11cb, #2575fc); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                <i class="fas fa-redo"></i> Try Again
            </button>
            <button onclick="document.getElementById('aiDescription').value = '/heal command for admins'; generateMTAscript();" class="error-btn" style="padding: 12px 25px; background: linear-gradient(90deg, #00b894, #00cec9); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                <i class="fas fa-magic"></i> Try Example
            </button>
        </div>
    </div>`;
}

// Copy code with cool notification
window.copyAICode = function() {
    const codeBlocks = document.querySelectorAll('.code-block pre');
    if (codeBlocks.length === 0) {
        showCoolNotification('📋 No code to copy', 'info');
        return;
    }
    
    let allCode = '';
    codeBlocks.forEach(block => {
        allCode += block.textContent + '\n\n';
    });
    
    navigator.clipboard.writeText(allCode).then(() => {
        showCoolNotification('📋 Code Copied to Clipboard!', 'success');
        
        const copyBtn = document.querySelector('.copy-btn');
        if (copyBtn) {
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            copyBtn.style.background = '#00b894';
            
            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
                copyBtn.style.background = '';
            }, 2000);
        }
    }).catch(err => {
        console.error('Copy failed:', err);
        showCoolNotification('❌ Copy failed. Try manually selecting.', 'error');
    });
};

// Cool notification system
function showCoolNotification(message, type = 'info') {
    const existing = document.getElementById('cool-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.id = 'cool-notification';
    notification.className = `cool-notification ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
        <div class="notification-progress"></div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Fill example text
window.fillExample = function(element) {
    const text = element.querySelector('span:last-child').textContent;
    const input = document.getElementById('aiDescription');
    if (input) {
        input.value = text;
        input.focus();
        showCoolNotification('📝 Example loaded! Click "Generate Code"', 'info');
    }
};

// Use in upload
window.useInUpload = function() {
    const codeBlocks = document.querySelectorAll('.code-block pre');
    if (codeBlocks.length === 0) {
        showCoolNotification('📝 No code to use in upload', 'info');
        return;
    }
    
    let allCode = '';
    codeBlocks.forEach(block => {
        allCode += block.textContent + '\n\n';
    });
    
    const uploadNav = document.querySelector('[data-section="upload"]');
    if (uploadNav) {
        uploadNav.click();
        
        setTimeout(() => {
            const descField = document.getElementById('fileDescription');
            if (descField) {
                descField.value = `AI Generated ${currentGame.toUpperCase()} Script:\n\n` + allCode;
                showCoolNotification('📤 Code loaded into upload form!', 'success');
                
                // Scroll to description field
                descField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                descField.focus();
            }
        }, 500);
    } else {
        showCoolNotification('⚠️ Navigate to Upload section first', 'info');
    }
};

// Function to update API key (for admin panel)
window.updateAIAPIKey = function(newKey) {
    if (newKey && newKey.startsWith('gsk_') && newKey.length > 30) {
        // Note: This won't work as GROQ_API_KEY is const
        // You'd need to refactor to use localStorage or server-side
        showCoolNotification('⚠️ Contact admin to update Groq key in code', 'info');
        return false;
    }
    return false;
};