/**
 * Custom Dropdown Manager for Imposter
 * Replaces native <select> for stealth and aesthetics
 */

export class CustomDropdown {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        
        this.value = options.defaultValue || '';
        this.options = options.options || []; // [{value, label, group}]
        this.onChangeCallback = options.onChange || null;
        this.placeholder = options.placeholder || 'Select...';
        
        this.isOpen = false;
        this.init();
    }

    init() {
        this.render();
        this.attachListeners();
    }

    render() {
        // Create trigger
        const selectedOption = this.options.find(o => o.value === this.value);
        const label = selectedOption ? selectedOption.label : this.placeholder;

        this.container.innerHTML = `
            <div class="dropdown-trigger">
                <span class="dropdown-value">${label}</span>
                <svg class="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>
            <div class="dropdown-menu">
                ${this.renderOptions()}
            </div>
        `;
        
        this.trigger = this.container.querySelector('.dropdown-trigger');
        this.menu = this.container.querySelector('.dropdown-menu');
    }

    renderOptions() {
        if (this.options.length === 0) {
            return `<div class="dropdown-option disabled">No items found</div>`;
        }

        let html = '';
        let currentGroup = null;

        this.options.forEach(opt => {
            if (opt.group && opt.group !== currentGroup) {
                currentGroup = opt.group;
                html += `<div class="dropdown-group-label">${currentGroup}</div>`;
            }
            const isSelected = opt.value === this.value;
            html += `
                <div class="dropdown-option ${isSelected ? 'selected' : ''}" data-value="${opt.value}">
                    ${opt.label}
                </div>
            `;
        });

        return html;
    }

    attachListeners() {
        this.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        this.menu.addEventListener('click', (e) => {
            const option = e.target.closest('.dropdown-option');
            if (option && !option.classList.contains('disabled')) {
                const newValue = option.getAttribute('data-value');
                this.select(newValue);
            }
        });

        // Close on click outside
        document.addEventListener('click', () => {
            if (this.isOpen) this.close();
        });
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    open() {
        // Close all other dropdowns first
        document.querySelectorAll('.dropdown-menu.active').forEach(m => {
            if (m !== this.menu) m.classList.remove('active');
        });
        document.querySelectorAll('.dropdown-trigger.active').forEach(t => {
            if (t !== this.trigger) t.classList.remove('active');
        });

        this.isOpen = true;
        this.menu.classList.add('active');
        this.trigger.classList.add('active');
        
        // Ensure menu is visible (scroll into view if needed in modal)
        this.menu.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    close() {
        this.isOpen = false;
        this.menu.classList.remove('active');
        this.trigger.classList.remove('active');
    }

    select(value) {
        if (this.value === value) {
            this.close();
            return;
        }

        this.value = value;
        const selectedOption = this.options.find(o => o.value === value);
        const label = selectedOption ? selectedOption.label : this.placeholder;
        
        const valueDisplay = this.container.querySelector('.dropdown-value');
        if (valueDisplay) valueDisplay.textContent = label;
        
        // Update selected class
        this.menu.querySelectorAll('.dropdown-option').forEach(opt => {
            opt.classList.toggle('selected', opt.getAttribute('data-value') === value);
        });

        this.close();
        
        if (this.onChangeCallback) {
            this.onChangeCallback(value);
        }
    }

    /**
     * Update the list of options dynamically
     * @param {Array} newOptions - Array of {value, label, group} objects
     */
    setOptions(newOptions) {
        this.options = newOptions;
        this.menu.innerHTML = this.renderOptions();
        
        // Update label in case the currently selected value's label changed or is new
        const selectedOption = this.options.find(o => o.value === this.value);
        const valueDisplay = this.container.querySelector('.dropdown-value');
        if (selectedOption && valueDisplay) {
            valueDisplay.textContent = selectedOption.label;
        } else if (!selectedOption && valueDisplay && this.options.length > 0) {
            // Keep current value if it's external, otherwise could reset to placeholder
        }
    }

    getValue() {
        return this.value;
    }

    setValue(value) {
        this.select(value);
    }
}
