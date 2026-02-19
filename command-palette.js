// Command Palette - CMD+K / Ctrl+K
// Commands: Refresh, Spawn Agent, View Agents, View Crons, View Schedule, Run Briefing, Kill All

(function() {
    const commands = [
        { id: 'refresh', name: 'Refresh', shortcut: 'R', action: () => window.refreshAll && refreshAll() },
        { id: 'spawn-agent', name: 'Spawn Agent', shortcut: 'S', action: () => window.spawnAgent && spawnAgent() },
        { id: 'view-agents', name: 'View Agents', shortcut: 'A', action: () => location.href = 'agents.html' },
        { id: 'view-crons', name: 'View Crons', shortcut: 'C', action: () => location.href = 'crons.html' },
        { id: 'view-schedule', name: 'View Schedule', shortcut: 'H', action: () => location.href = 'missions.html' },
        { id: 'run-briefing', name: 'Run Briefing', shortcut: 'B', action: () => window.openBriefingModal && openBriefingModal() },
        { id: 'kill-all', name: 'Kill All', shortcut: 'K', action: () => window.quickAction && quickAction('kill-all') }
    ];

    let selectedIndex = 0;
    let filteredCommands = [...commands];
    
    // DOM elements
    let overlay = null;
    let input = null;
    let list = null;
    let isOpen = false;

    function init() {
        overlay = document.getElementById('cmdk-overlay');
        input = document.getElementById('cmdk-input');
        list = document.getElementById('cmdk-list');

        if (!overlay || !input || !list) {
            console.error('Command palette elements not found');
            return;
        }

        // Event listeners
        input.addEventListener('input', (e) => filterCommands(e.target.value));
        input.addEventListener('keydown', handleKeydown);
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        console.log('Command Palette initialized - Press CMD+K or Ctrl+K');
    }

    function openModal() {
        if (isOpen) return;
        
        overlay.style.display = 'flex';
        // Force reflow for transition
        overlay.offsetHeight;
        overlay.classList.add('cmdk-open');
        
        setTimeout(() => {
            input.focus();
            input.select();
        }, 50);

        selectedIndex = 0;
        filteredCommands = [...commands];
        renderList();
        isOpen = true;
    }

    function closeModal() {
        if (!isOpen) return;
        
        overlay.classList.remove('cmdk-open');
        
        setTimeout(() => {
            overlay.style.display = 'none';
            input.value = '';
            filteredCommands = [...commands];
            selectedIndex = 0;
        }, 150);
        
        isOpen = false;
    }

    function filterCommands(query) {
        const q = query.toLowerCase().trim();
        if (!q) {
            filteredCommands = [...commands];
        } else {
            filteredCommands = commands.filter(cmd =>
                cmd.name.toLowerCase().includes(q) ||
                cmd.id.toLowerCase().includes(q)
            );
        }
        selectedIndex = 0;
        renderList(query);
    }

    function highlightMatch(text, query) {
        if (!query) return `<span>${text}</span>`;
        const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function renderList(query = '') {
        list.innerHTML = '';

        if (filteredCommands.length === 0) {
            list.innerHTML = '<li class="cmdk-empty">No commands found</li>';
            return;
        }

        filteredCommands.forEach((cmd, index) => {
            const li = document.createElement('li');
            li.className = 'cmdk-item' + (index === selectedIndex ? ' cmdk-selected' : '');
            li.innerHTML = `
                <span class="cmdk-item-text">${highlightMatch(cmd.name, query)}</span>
                <span class="cmdk-item-shortcut">${cmd.shortcut}</span>
            `;
            li.addEventListener('click', () => executeCommand(index));
            li.addEventListener('mouseenter', () => {
                selectedIndex = index;
                updateSelection();
            });
            list.appendChild(li);
        });
    }

    function updateSelection() {
        const items = list.querySelectorAll('.cmdk-item');
        items.forEach((item, index) => {
            item.classList.toggle('cmdk-selected', index === selectedIndex);
        });
        
        // Scroll selected into view
        const selected = items[selectedIndex];
        if (selected) {
            selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    function handleKeydown(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (filteredCommands.length > 0) {
                selectedIndex = (selectedIndex + 1) % filteredCommands.length;
                updateSelection();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (filteredCommands.length > 0) {
                selectedIndex = (selectedIndex - 1 + filteredCommands.length) % filteredCommands.length;
                updateSelection();
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            executeCommand(selectedIndex);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeModal();
        }
    }

    function executeCommand(index) {
        if (index >= 0 && index < filteredCommands.length) {
            const cmd = filteredCommands[index];
            closeModal();
            setTimeout(() => cmd.action(), 150);
        }
    }

    // Global hotkey listener (CMD+K / Ctrl+K)
    document.addEventListener('keydown', (e) => {
        // Use e.key === 'k' to ensure we catch the key
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (isOpen) {
                closeModal();
            } else {
                openModal();
            }
        }
        // Also allow / key to open palette
        if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
                return;
            }
            e.preventDefault();
            openModal();
        }
    });

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose to global scope
    window.openCommandPalette = openModal;
    window.closeCommandPalette = closeModal;
})();
