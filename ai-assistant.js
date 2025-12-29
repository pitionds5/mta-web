// ==============================================
// ADVANCED AI ASSISTANT - MTA & SAMP
// ==============================================

// API Key - Only you can change it via admin panel
let OPENROUTER_KEY = "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"; // Initial key

let currentGame = 'mta';
let isGenerating = false;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Load API key from localStorage (set by admin panel)
    const savedKey = localStorage.getItem('ai_api_key');
    if (savedKey && savedKey.length > 30) {
        OPENROUTER_KEY = savedKey;
        console.log("✅ AI API Key loaded from storage");
    }
    
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
    if (isGenerating) return;
    
    const input = document.getElementById('aiDescription');
    const output = document.getElementById('aiCodeOutput');
    
    if (!input || !input.value.trim()) {
        showCoolNotification('📝 Please describe what you need!', 'info');
        return;
    }
    
    isGenerating = true;
    const userRequest = input.value.trim();
    
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
        const aiResponse = await callAI(userRequest, currentGame);
        
        clearInterval(dotInterval);
        output.innerHTML = createResultScreen(aiResponse);
        
        // Scroll to result
        output.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Show success notification
        showCoolNotification('✨ Code Generated Successfully!', 'success');
        
    } catch (error) {
        clearInterval(dotInterval);
        output.innerHTML = createErrorScreen(error);
        showCoolNotification('❌ AI Generation Failed', 'error');
    } finally {
        isGenerating = false;
    }
};

// Call AI API
async function callAI(userPrompt, game) {
    if (!OPENROUTER_KEY || OPENROUTER_KEY.includes("xxxx")) {
        throw new Error('AI service is currently being updated. Please try again later.');
    }
    
    const systemPrompt = game === 'mta' 
        ? `You are an expert MTA:SA Lua programmer. Generate complete, working MTA Lua scripts.
           Start with: "🔥 Generated by Louay Zaid's AI Assistant 🔥"
           Then provide the code in \`\`\`lua code blocks.
           Include proper error handling, admin checks, and comments.`
        : `You are an expert SA-MP Pawn programmer. Generate complete, working Pawn scripts.
           Start with: "🔥 Generated by Louay Zaid's AI Assistant 🔥"
           Then provide the code in \`\`\`pawn code blocks.
           Include proper error handling, admin checks, and comments.`;
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://mta-website.com",
            "X-Title": "Louay Zaid's AI Assistant"
        },
        body: JSON.stringify({
            model: "openai/gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            max_tokens: 2500
        })
    });
    
    if (!response.ok) {
        const error = await response.text();
        
        // Check if API key is invalid
        if (response.status === 401 || response.status === 403) {
            throw new Error('AI service needs update. Contact admin.');
        }
        
        throw new Error(`AI Error: ${response.status}`);
    }
    
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
        <div class="loading-subtext">Powered By Louay</div>
    </div>`;
}

function createResultScreen(aiResponse) {
    let formattedResponse = aiResponse;
    
    formattedResponse = formattedResponse.replace(/```(\w+)?\n([\s\S]*?)```/g, 
        '<div class="code-block"><div class="code-header">$1</div><pre class="language-$1">$2</pre></div>');
    
    return `
    <div class="ai-result-screen">
        <div class="result-header">
            <div class="game-badge ${currentGame}">
                <i class="fas ${currentGame === 'mta' ? 'fa-gamepad' : 'fa-server'}"></i>
                ${currentGame.toUpperCase()}
            </div>
            <div class="signature-watermark">
                <i class="fas fa-crown"></i> By Louay Zaid
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
                <i class="fas fa-crown"></i> Powered By Louay • 
                <i class="fas fa-robot"></i> AI Assistant
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
            <h4>Possible reasons:</h4>
            <ul style="text-align: left; color: #a0a0d0; padding-left: 20px;">
                <li>AI service is temporarily unavailable</li>
                <li>Your request was too complex</li>
                <li>Try a simpler description</li>
                <li>Please try again in 30 seconds</li>
            </ul>
        </div>
        
        <button onclick="generateMTAscript()" class="error-btn">
            <i class="fas fa-redo"></i> Try Again
        </button>
    </div>`;
}

// Copy code with cool notification
window.copyAICode = function() {
    const codeBlocks = document.querySelectorAll('.code-block pre');
    if (codeBlocks.length === 0) return;
    
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
    document.getElementById('aiDescription').value = text;
    showCoolNotification('📝 Example loaded!', 'info');
};

// Use in upload
window.useInUpload = function() {
    const codeBlocks = document.querySelectorAll('.code-block pre');
    if (codeBlocks.length === 0) return;
    
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
            }
        }, 500);
    }
};

// Function to update API key (called from admin panel)
window.updateAIAPIKey = function(newKey) {
    if (newKey && newKey.length > 30) {
        OPENROUTER_KEY = newKey;
        localStorage.setItem('ai_api_key', newKey);
        console.log("✅ AI API Key updated");
        return true;
    }
    return false;
};