// --- Smooth Scrolling ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// --- Scroll Reveal Animation ---
const revealElements = document.querySelectorAll('.reveal');
const revealOptions = { threshold: 0.15, rootMargin: "0px 0px -50px 0px" };

const revealObserver = new IntersectionObserver(function(entries, observer) {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
    });
}, revealOptions);

revealElements.forEach(el => revealObserver.observe(el));

// --- State Management ---
let currentProfile = null;
let chatHistory = [];
let lastGeneratedResult = null;
let typingIndicatorElement = null;

// --- Elements ---
const form = document.getElementById('futureme-form');
const loadingState = document.getElementById('loading-state');
const resultState = document.getElementById('result-state');
const resultContent = document.getElementById('result-content');
const errorMsg = document.getElementById('form-error');
const resetBtn = document.getElementById('reset-btn');
const copyBtn = document.getElementById('copy-btn');
const shareBtn = document.getElementById('share-btn');
const toast = document.getElementById('toast');

const chatContainer = document.getElementById('chat-container');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');

let toastTimeout;

// --- Toast Utility ---
function showToast(message) {
    clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.classList.add('show');
    
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// --- Dynamic DOM Generation Helpers (XSS Prevention) ---
function createResultSection(titleText, contentText, customClass, isList = false) {
    const section = document.createElement('div');
    section.className = 'result-section';
    if (customClass) {
        section.className += ' ' + customClass;
    }
    
    const h4 = document.createElement('h4');
    h4.textContent = titleText;
    section.appendChild(h4);
    
    if (isList && Array.isArray(contentText)) {
        const ul = document.createElement('ul');
        contentText.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            ul.appendChild(li);
        });
        section.appendChild(ul);
    } else {
        const p = document.createElement('p');
        p.textContent = contentText;
        section.appendChild(p);
    }
    
    return section;
}

function renderResult(data) {
    // Clear previous results safely
    resultContent.replaceChildren();

    // Create Title
    const title = document.createElement('h3');
    title.style.color = '#fff';
    title.style.marginBottom = '1.5rem';
    title.style.fontSize = '1.5rem';
    title.textContent = 'Message from your FutureMe';
    resultContent.appendChild(title);

    // Create Main Message Bubble
    const msgDiv = document.createElement('div');
    msgDiv.className = 'result-msg';
    msgDiv.textContent = `"${data.message}"`;
    resultContent.appendChild(msgDiv);

    // Create Future Identity Section
    resultContent.appendChild(createResultSection('Your Future Identity', data.futureIdentity));

    // Create Next Moves List Section
    resultContent.appendChild(createResultSection('Your Next 3 Moves', data.nextMoves, null, true));

    // Create Daily Habit Section
    resultContent.appendChild(createResultSection('One Habit to Start Today', data.habit));

    // Create Warning Section (with custom class)
    resultContent.appendChild(createResultSection('Future Warning', data.warning, 'warning-section'));

    // Create Daily Mantra Section (with custom class)
    resultContent.appendChild(createResultSection('Daily Mantra', data.mantra, 'mantra-section'));
}

// --- Chat View Management ---
function appendChatBubble(role, text) {
    // Remove placeholder if present
    const placeholder = document.getElementById('chat-placeholder');
    if (placeholder) {
        placeholder.remove();
    }
    
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble ' + (role === 'user' ? 'bubble-user' : 'bubble-ai');
    
    const label = document.createElement('span');
    label.className = 'chat-label';
    label.textContent = role === 'user' ? 'You' : 'FutureMe';
    bubble.appendChild(label);
    
    const content = document.createElement('div');
    content.style.whiteSpace = 'pre-wrap';
    content.textContent = text;
    bubble.appendChild(content);
    
    chatContainer.appendChild(bubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function showTypingIndicator() {
    if (typingIndicatorElement) return;
    
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble bubble-ai';
    bubble.id = 'chat-typing-indicator';
    
    const label = document.createElement('span');
    label.className = 'chat-label';
    label.textContent = 'FutureMe is typing';
    bubble.appendChild(label);
    
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'typing-dot';
        indicator.appendChild(dot);
    }
    
    bubble.appendChild(indicator);
    chatContainer.appendChild(bubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    typingIndicatorElement = bubble;
}

function hideTypingIndicator() {
    if (typingIndicatorElement) {
        typingIndicatorElement.remove();
        typingIndicatorElement = null;
    }
}

// --- App Event Listeners ---

// Submit Identity Parameters
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.style.display = 'none';

    // Get input values
    const name = document.getElementById('fm-name').value.trim();
    const age = document.getElementById('fm-age').value.trim();
    const goal = document.getElementById('fm-goal').value.trim();
    const struggle = document.getElementById('fm-struggle').value.trim();
    const timeline = document.getElementById('fm-timeline').value.trim();
    const tone = document.getElementById('fm-tone').value;

    if (!name || !age || !goal || !struggle || !timeline || !tone) {
        errorMsg.style.display = 'block';
        return;
    }

    currentProfile = { name, age, goal, struggle, oneYearVision: timeline, tone };

    // Toggle loading states and disable submission double click
    form.style.display = 'none';
    loadingState.style.display = 'block';
    
    const submitBtn = document.getElementById('fm-submit-btn');
    submitBtn.disabled = true;

    try {
        // Call backend API
        const response = await fetch('/api/generate-futureme', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(currentProfile)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            lastGeneratedResult = result.data;
            
            // Render Result Card dynamically
            renderResult(lastGeneratedResult);
            
            // Switch states
            loadingState.style.display = 'none';
            resultState.style.display = 'block';

            // Enable and initialize chat container
            chatHistory = [];
            chatContainer.replaceChildren();
            appendChatBubble('futureme', lastGeneratedResult.message);
            chatHistory.push({ role: 'futureme', message: lastGeneratedResult.message });

            chatInput.disabled = false;
            chatSendBtn.disabled = false;
            
            showToast("Connection established. Your FutureMe is waiting below.");
        } else {
            throw new Error(result.error || 'Server error');
        }
    } catch (err) {
        console.error("Fetch error:", err);
        loadingState.style.display = 'none';
        form.style.display = 'block';
        showToast("FutureMe could not respond right now. Try again.");
    } finally {
        submitBtn.disabled = false;
    }
});

// Reset form and UI
resetBtn.addEventListener('click', () => {
    resultState.style.display = 'none';
    form.reset();
    form.style.display = 'block';
    
    // Clear chat states
    chatInput.disabled = true;
    chatInput.value = '';
    chatSendBtn.disabled = true;
    chatContainer.replaceChildren();
    
    const placeholder = document.createElement('div');
    placeholder.className = 'chat-placeholder';
    placeholder.id = 'chat-placeholder';
    placeholder.textContent = 'You must establish a connection with your FutureMe before you can ask questions. Fill out the form above.';
    chatContainer.appendChild(placeholder);
    
    currentProfile = null;
    chatHistory = [];
    lastGeneratedResult = null;
    
    // Smooth scroll back to create section
    document.getElementById('create').scrollIntoView({ behavior: 'smooth' });
});

// Copy Results to Clipboard
copyBtn.addEventListener('click', async () => {
    if (!lastGeneratedResult || !currentProfile) return;

    const textToCopy = `FutureMe Reflection for ${currentProfile.name}
----------------------------------------
Future Identity:
"${lastGeneratedResult.futureIdentity}"

Message from Future Self:
"${lastGeneratedResult.message}"

Next 3 Moves:
${lastGeneratedResult.nextMoves.map((move, index) => `${index + 1}. ${move}`).join('\n')}

Daily Habit:
${lastGeneratedResult.habit}

Future Warning:
${lastGeneratedResult.warning}

Mantra:
${lastGeneratedResult.mantra}
----------------------------------------
Nitish's Founder Labs - FutureMe`;

    try {
        await navigator.clipboard.writeText(textToCopy);
        showToast("Reflection copied to clipboard!");
    } catch (err) {
        console.error("Clipboard error:", err);
        showToast("Failed to copy. Try selecting text manually.");
    }
});

// Interactive Chat Sending
async function sendChatMessage() {
    const question = chatInput.value.trim();
    if (!question || !currentProfile) return;

    // Append user message immediately
    appendChatBubble('user', question);
    chatInput.value = '';
    
    // Disable inputs during network request to prevent spamming
    chatInput.disabled = true;
    chatSendBtn.disabled = true;

    // Show typing state
    showTypingIndicator();

    try {
        const response = await fetch('/api/chat-futureme', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userProfile: currentProfile,
                chatHistory: chatHistory,
                question: question
            })
        });

        const result = await response.json();
        hideTypingIndicator();

        if (response.ok && result.success) {
            // Append FutureMe response
            appendChatBubble('futureme', result.reply);
            
            // Save state
            chatHistory.push({ role: 'user', message: question });
            chatHistory.push({ role: 'futureme', message: result.reply });
        } else {
            throw new Error(result.error || 'Server error');
        }
    } catch (err) {
        console.error("Chat error:", err);
        hideTypingIndicator();
        showToast("FutureMe could not respond right now. Try again.");
    } finally {
        chatInput.disabled = false;
        chatSendBtn.disabled = false;
        chatInput.focus();
    }
}

chatSendBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendChatMessage();
    }
});

// Share button handler
shareBtn.addEventListener('click', () => {
    if (lastGeneratedResult) {
        copyBtn.click();
    } else {
        showToast("Generate your FutureMe reflection first to share.");
    }
});
