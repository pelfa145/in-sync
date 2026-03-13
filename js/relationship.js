// Relationship Features JavaScript
let goalsUnsubscribe = null;
let moodUnsubscribe = null;
let selectedMood = null;
let currentGameQuestions = [];
let currentGameIndex = 0;
let gameScore = 0;

// Initialize relationship features
function initRelationship() {
    const relationshipBtn = document.getElementById('relationship-btn');
    const backBtn = document.getElementById('relationship-back');
    const goalsBtn = document.getElementById('goals-btn');
    const moodBtn = document.getElementById('mood-btn');
    const gamesBtn = document.getElementById('games-btn');
    const dateBtn = document.getElementById('date-btn');

    if (relationshipBtn) {
        relationshipBtn.addEventListener('click', () => navigateTo('relationship'));
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => navigateTo('home'));
    }

    if (goalsBtn) {
        goalsBtn.addEventListener('click', () => navigateTo('goals'));
    }

    if (moodBtn) {
        moodBtn.addEventListener('click', () => navigateTo('mood'));
    }

    if (gamesBtn) {
        gamesBtn.addEventListener('click', () => navigateTo('games'));
    }

    if (dateBtn) {
        dateBtn.addEventListener('click', () => navigateTo('date'));
    }

    // Initialize individual features
    initGoals();
    initMood();
    initGames();
    initDatePlanner();
}

// GOALS FEATURE - Enhanced with localStorage fallback
let goalsData = [];

function initGoals() {
    const backBtn = document.getElementById('goals-back');
    const addBtn = document.getElementById('add-goal-btn');
    const input = document.getElementById('goal-input');

    if (backBtn) {
        backBtn.addEventListener('click', () => navigateTo('relationship'));
    }

    if (addBtn) {
        addBtn.addEventListener('click', addGoal);
    }

    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addGoal();
            }
        });
    }

    // Load from localStorage first for immediate display
    loadLocalGoals();
    // Then try to load from database
    loadGoals();
}

function loadLocalGoals() {
    const userId = AppState.currentUser?.id;
    if (!userId) return;
    
    const localGoals = localStorage.getItem(`goals_${userId}`);
    if (localGoals) {
        try {
            goalsData = JSON.parse(localGoals);
            renderGoals(goalsData);
        } catch (e) {
            console.error('Error parsing local goals:', e);
        }
    }
}

function saveLocalGoals() {
    const userId = AppState.currentUser?.id;
    if (!userId) return;
    
    localStorage.setItem(`goals_${userId}`, JSON.stringify(goalsData));
}

function loadGoals() {
    if (!AppState.currentUser) return;

    const pId = AppState.partner?.id || AppState.currentUser.partnerId;

    if (goalsUnsubscribe) {
        goalsUnsubscribe();
    }

    // Check if subscribeGoals is available (database is set up)
    if (typeof subscribeGoals !== 'function') {
        console.log('Goals database not available, using localStorage only');
        return;
    }

    goalsUnsubscribe = subscribeGoals(
        AppState.currentUser.id,
        pId || undefined,
        (goals) => {
            goalsData = goals;
            renderGoals(goals);
            // Sync to localStorage as backup
            saveLocalGoals();
        }
    );
}

function renderGoals(goals) {
    const container = document.getElementById('goals-list');
    if (!container) return;

    if (goals.length === 0) {
        container.innerHTML = `
            <div class="goals-empty">
                <span class="empty-icon">🎯</span>
                <p>No goals yet. Add your first goal!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = goals.map(goal => `
        <div class="goal-item ${goal.completed ? 'completed' : ''}">
            <div class="goal-checkbox ${goal.completed ? 'completed' : ''}" data-id="${goal.id}">
                ${goal.completed ? '✓' : ''}
            </div>
            <div class="goal-text ${goal.completed ? 'completed' : ''}">${escapeHtml(goal.text)}</div>
            <button class="goal-delete" data-id="${goal.id}">×</button>
        </div>
    `).join('');

    // Add event listeners
    container.querySelectorAll('.goal-checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', () => toggleGoal(checkbox.dataset.id));
    });

    container.querySelectorAll('.goal-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteGoal(btn.dataset.id);
        });
    });
}

async function addGoal() {
    const input = document.getElementById('goal-input');
    const text = input.value.trim();
    
    if (!text) return;
    if (!AppState.currentUser) {
        alert('Please log in to add goals');
        return;
    }

    const newGoal = {
        id: 'local_' + Date.now(),
        userId: AppState.currentUser.id,
        partnerId: AppState.partner?.id || null,
        text,
        completed: false,
        createdAt: new Date().toISOString()
    };

    // Add to local data immediately
    goalsData.unshift(newGoal);
    saveLocalGoals();
    renderGoals(goalsData);
    input.value = '';

    // Try to save to database if available
    if (typeof createGoal === 'function') {
        try {
            await createGoal(newGoal);
        } catch (error) {
            console.log('Goal saved locally only (database unavailable)');
        }
    }
}

async function toggleGoal(goalId) {
    const goalIndex = goalsData.findIndex(g => g.id === goalId);
    if (goalIndex === -1) return;

    const goal = goalsData[goalIndex];
    goal.completed = !goal.completed;
    
    saveLocalGoals();
    renderGoals(goalsData);

    // Try to update database if available
    if (typeof updateGoal === 'function') {
        try {
            await updateGoal(goalId, { completed: goal.completed });
        } catch (error) {
            console.log('Goal updated locally only');
        }
    }
}

async function deleteGoal(goalId) {
    if (!confirm('Delete this goal?')) return;

    goalsData = goalsData.filter(g => g.id !== goalId);
    saveLocalGoals();
    renderGoals(goalsData);

    // Try to delete from database if available
    if (typeof deleteGoalFromDB === 'function') {
        try {
            await deleteGoalFromDB(goalId);
        } catch (error) {
            console.log('Goal deleted locally only');
        }
    }
}

// MOOD TRACKING FEATURE
function initMood() {
    const backBtn = document.getElementById('mood-back');
    const saveBtn = document.getElementById('save-mood-btn');
    const moodEmojis = document.querySelectorAll('.mood-emoji');

    if (backBtn) {
        backBtn.addEventListener('click', () => navigateTo('relationship'));
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', saveMoodEntry);
    }

    moodEmojis.forEach(emoji => {
        emoji.addEventListener('click', () => {
            moodEmojis.forEach(e => e.classList.remove('selected'));
            emoji.classList.add('selected');
            selectedMood = parseInt(emoji.dataset.mood);
        });
    });

    loadMoodHistory();
}

function loadMoodHistory() {
    if (!AppState.currentUser) return;

    const pId = AppState.partner?.id || AppState.currentUser.partnerId;

    if (moodUnsubscribe) {
        moodUnsubscribe();
    }

    moodUnsubscribe = subscribeMoodEntries(
        AppState.currentUser.id,
        pId || undefined,
        (entries) => {
            renderMoodHistory(entries);
        }
    );
}

function renderMoodHistory(entries) {
    const container = document.getElementById('mood-history');
    if (!container) return;

    const moodEmojis = ['', '😢', '😔', '😐', '😊', '😍'];
    
    container.innerHTML = entries.slice(0, 10).map(entry => `
        <div class="mood-entry">
            <div class="mood-entry-header">
                <span class="mood-entry-emoji">${moodEmojis[entry.mood] || '😐'}</span>
                <span class="mood-entry-date">${new Date(entry.createdAt).toLocaleDateString()}</span>
            </div>
            ${entry.note ? `<div class="mood-entry-note">${escapeHtml(entry.note)}</div>` : ''}
        </div>
    `).join('');
}

async function saveMoodEntry() {
    const note = document.getElementById('mood-note').value.trim();
    
    if (!selectedMood) {
        alert('Please select how you\'re feeling first!');
        return;
    }

    try {
        await createMoodEntry({
            userId: AppState.currentUser.id,
            partnerId: AppState.partner?.id || null,
            mood: selectedMood,
            note
        });

        // Reset form
        document.getElementById('mood-note').value = '';
        document.querySelectorAll('.mood-emoji').forEach(e => e.classList.remove('selected'));
        selectedMood = null;
    } catch (error) {
        console.error('Failed to save mood entry:', error);
        if (error.code === 'PGRST116') {
            alert('Mood tracking feature is not available yet. Please contact support to set up the database tables.');
        } else {
            alert('Failed to save check-in. Please try again.');
        }
    }
}

// MEMORY GAMES FEATURE
function initGames() {
    const backBtn = document.getElementById('games-back');
    const startBtn = document.getElementById('start-game-btn');
    const playAgainBtn = document.getElementById('play-again-btn');

    if (backBtn) {
        backBtn.addEventListener('click', () => navigateTo('relationship'));
    }

    if (startBtn) {
        startBtn.addEventListener('click', startGame);
    }

    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', startGame);
    }
}

function startGame() {
    currentGameIndex = 0;
    gameScore = 0;
    currentGameQuestions = generateGameQuestions();
    
    document.getElementById('game-start').classList.add('hidden');
    document.getElementById('game-result').classList.add('hidden');
    document.getElementById('game-question').classList.remove('hidden');
    
    showNextQuestion();
}

function generateGameQuestions() {
    const questions = [];
    
    // Generate questions based on memories
    if (AppState.memories && AppState.memories.length > 0) {
        const memories = [...AppState.memories].sort(() => Math.random() - 0.5).slice(0, 5);
        
        memories.forEach((memory, index) => {
            questions.push({
                question: `When was "${memory.title}" created?`,
                options: generateDateOptions(memory.createdAt),
                correct: new Date(memory.createdAt).toLocaleDateString(),
                type: 'date'
            });
        });
    }
    
    // Add some generic questions if not enough memories
    while (questions.length < 5) {
        questions.push({
            question: 'What is your partner\'s favorite color?',
            options: ['Red', 'Blue', 'Green', 'Yellow'],
            correct: 'Blue', // Default answer
            type: 'generic'
        });
    }
    
    return questions;
}

function generateDateOptions(correctDate) {
    const correct = new Date(correctDate);
    const options = [correct.toLocaleDateString()];
    
    // Generate 3 wrong dates
    for (let i = 0; i < 3; i++) {
        const wrongDate = new Date(correct);
        wrongDate.setDate(wrongDate.getDate() + Math.floor(Math.random() * 20) - 10);
        options.push(wrongDate.toLocaleDateString());
    }
    
    return options.sort(() => Math.random() - 0.5);
}

function showNextQuestion() {
    if (currentGameIndex >= currentGameQuestions.length) {
        showGameResult();
        return;
    }

    const question = currentGameQuestions[currentGameIndex];
    document.getElementById('question-number').textContent = `Question ${currentGameIndex + 1}/${currentGameQuestions.length}`;
    document.getElementById('question-text').textContent = question.question;
    
    const optionsContainer = document.getElementById('game-options');
    optionsContainer.innerHTML = question.options.map(option => `
        <button class="game-option" data-answer="${option}">${option}</button>
    `).join('');

    // Add click handlers
    optionsContainer.querySelectorAll('.game-option').forEach(btn => {
        btn.addEventListener('click', () => checkAnswer(btn.dataset.answer));
    });
}

function checkAnswer(answer) {
    const question = currentGameQuestions[currentGameIndex];
    const options = document.querySelectorAll('.game-option');
    
    options.forEach(btn => {
        btn.disabled = true;
        if (btn.dataset.answer === question.correct) {
            btn.classList.add('correct');
        } else if (btn.dataset.answer === answer && answer !== question.correct) {
            btn.classList.add('incorrect');
        }
    });

    if (answer === question.correct) {
        gameScore++;
    }

    setTimeout(() => {
        currentGameIndex++;
        showNextQuestion();
    }, 1500);
}

function showGameResult() {
    document.getElementById('game-question').classList.add('hidden');
    document.getElementById('game-result').classList.remove('hidden');
    
    document.getElementById('score-number').textContent = gameScore;
    
    let message = '';
    if (gameScore === 5) {
        message = 'Perfect! You know each other so well! 🎉';
    } else if (gameScore >= 3) {
        message = 'Great job! You have wonderful memories together! 💕';
    } else {
        message = 'Keep creating more memories together! 🌟';
    }
    
    document.getElementById('result-message').textContent = message;
}

// DATE PLANNER FEATURE
function initDatePlanner() {
    const backBtn = document.getElementById('date-back');
    const categoryBtns = document.querySelectorAll('.category-btn');

    if (backBtn) {
        backBtn.addEventListener('click', () => navigateTo('relationship'));
    }

    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            showDateSuggestions(btn.dataset.category);
        });
    });

    // Show initial suggestions based on memories
    showMemoryBasedSuggestions();
}

function showMemoryBasedSuggestions() {
    const suggestions = generateMemoryBasedSuggestions();
    renderDateSuggestions(suggestions);
}

function generateMemoryBasedSuggestions() {
    const suggestions = [];
    
    if (AppState.memories && AppState.memories.length > 0) {
        // Analyze memories to generate suggestions
        const photoMemories = AppState.memories.filter(m => m.type === 'photo');
        const outdoorMemories = AppState.memories.filter(m => 
            m.description && (m.description.toLowerCase().includes('park') || 
            m.description.toLowerCase().includes('outdoor') || 
            m.description.toLowerCase().includes('nature'))
        );
        const foodMemories = AppState.memories.filter(m => 
            m.description && (m.description.toLowerCase().includes('dinner') || 
            m.description.toLowerCase().includes('restaurant') || 
            m.description.toLowerCase().includes('food'))
        );

        if (photoMemories.length > 2) {
            suggestions.push({
                title: 'Photo Walk Adventure',
                description: 'Recreate your favorite photo spots and capture new memories',
                tags: ['photography', 'outdoor', 'romantic'],
                category: 'outdoor'
            });
        }

        if (outdoorMemories.length > 0) {
            suggestions.push({
                title: 'Nature Picnic',
                description: 'Pack a picnic and visit a beautiful outdoor spot',
                tags: ['nature', 'food', 'relaxing'],
                category: 'outdoor'
            });
        }

        if (foodMemories.length > 0) {
            suggestions.push({
                title: 'Cooking Together',
                description: 'Recreate your favorite restaurant meal at home',
                tags: ['cooking', 'food', 'intimate'],
                category: 'food'
            });
        }
    }

    // Add default suggestions
    suggestions.push(
        {
            title: 'Stargazing Night',
            description: 'Find a quiet spot away from city lights and watch the stars',
            tags: ['romantic', 'outdoor', 'free'],
            category: 'outdoor'
        },
        {
            title: 'Art Gallery Date',
            description: 'Explore local art and discuss your favorite pieces',
            tags: ['culture', 'creative', 'indoor'],
            category: 'creative'
        }
    );

    return suggestions;
}

function showDateSuggestions(category) {
    const suggestions = generateCategorySuggestions(category);
    renderDateSuggestions(suggestions);
}

function generateCategorySuggestions(category) {
    const categorySuggestions = {
        outdoor: [
            {
                title: 'Hiking Adventure',
                description: 'Explore a new trail and enjoy nature together',
                tags: ['active', 'nature', 'free']
            },
            {
                title: 'Beach Day',
                description: 'Spend the day relaxing by the water',
                tags: ['relaxing', 'summer', 'romantic']
            },
            {
                title: 'Bike Ride',
                description: 'Rent bikes and explore the city or countryside',
                tags: ['active', 'exploring', 'fun']
            }
        ],
        food: [
            {
                title: 'Cooking Class',
                description: 'Learn to make a new cuisine together',
                tags: ['learning', 'interactive', 'delicious']
            },
            {
                title: 'Food Festival',
                description: 'Try various foods from different vendors',
                tags: ['social', 'tasting', 'adventurous']
            },
            {
                title: 'Wine Tasting',
                description: 'Sample different wines and learn about pairings',
                tags: ['sophisticated', 'relaxing', 'romantic']
            }
        ],
        creative: [
            {
                title: 'Pottery Class',
                description: 'Create something beautiful with your hands',
                tags: ['artistic', 'hands-on', 'memorable']
            },
            {
                title: 'Painting Night',
                description: 'Follow along with a guided painting session',
                tags: ['creative', 'relaxing', 'fun']
            },
            {
                title: 'DIY Workshop',
                description: 'Build something together for your home',
                tags: ['practical', 'teamwork', 'rewarding']
            }
        ],
        relaxing: [
            {
                title: 'Spa Day',
                description: 'Pamper yourselves with massages and treatments',
                tags: ['luxury', 'relaxation', 'self-care']
            },
            {
                title: 'Movie Marathon',
                description: 'Watch your favorite films together at home',
                tags: ['cozy', 'comfortable', 'intimate']
            },
            {
                title: 'Bookstore Date',
                description: 'Browse books and pick one for each other',
                tags: ['quiet', 'intellectual', 'thoughtful']
            }
        ],
        adventure: [
            {
                title: 'Rock Climbing',
                description: 'Challenge yourselves with indoor or outdoor climbing',
                tags: ['adrenaline', 'teamwork', 'exciting']
            },
            {
                title: 'Kayaking',
                description: 'Paddle together on a lake or river',
                tags: ['water', 'active', 'scenic']
            },
            {
                title: 'Escape Room',
                description: 'Work together to solve puzzles and escape',
                tags: ['puzzles', 'teamwork', 'thrilling']
            }
        ]
    };

    return categorySuggestions[category] || [];
}

function renderDateSuggestions(suggestions) {
    const container = document.getElementById('suggestion-cards');
    if (!container) return;

    container.innerHTML = suggestions.map(suggestion => `
        <div class="suggestion-card">
            <div class="suggestion-title">${suggestion.title}</div>
            <div class="suggestion-description">${suggestion.description}</div>
            <div class="suggestion-tags">
                ${suggestion.tags.map(tag => `<span class="suggestion-tag">${tag}</span>`).join('')}
            </div>
        </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.suggestion-card').forEach((card, index) => {
        card.addEventListener('click', () => {
            alert(`Great choice! "${suggestions[index].title}" sounds like a wonderful date idea. 🌟`);
        });
    });
}

// Helper function
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize when app is ready
if (window.AppStateReady) {
    initRelationship();
} else {
    document.addEventListener('appReady', initRelationship);
}
