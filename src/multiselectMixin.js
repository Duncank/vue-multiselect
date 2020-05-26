function isEmpty(opt) {
    if (opt === 0) return false;
    if (Array.isArray(opt) && opt.length === 0) return true;
    return !opt;
}

function not(fun) {
    return (...params) => !fun(...params);
}

function debounce(func, wait, immediate) {
    let timeout;
    return function debouncer(...args) {
        const context = this;
        const later = function debouncerlater() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

function includes(str, query) {
    /* istanbul ignore else */
    if (str === undefined) str = 'undefined';
    if (str === null) str = 'null';
    if (str === false) str = 'false';
    const text = str.toString().toLowerCase();
    return text.indexOf(query.trim()) !== -1;
}

function filterOptions(options, search, label, customLabel) {
    return options.filter((option) => includes(customLabel(option, label), search));
}

function stripGroups(options) {
    return options.filter((option) => !option.$isLabel);
}

function flattenOptions(values, label) {
    return (options) => options.reduce((prev, curr) => {
        /* istanbul ignore else */
        if (curr[values] && curr[values].length) {
            prev.push({
                $groupLabel: curr[label],
                $isLabel: true,
            });
            return prev.concat(curr[values]);
        }
        return prev;
    }, []);
}

function filterGroups(search, label, values, groupLabel, customLabel) {
    return (groups) => groups.map((group) => {
        /* istanbul ignore else */
        if (!group[values]) {
            console.warn(
                'Options passed to vue-multiselect do not contain groups, despite the config.',
            );
            return [];
        }
        const groupOptions = filterOptions(group[values], search, label, customLabel);

        return groupOptions.length
            ? {
                [groupLabel]: group[groupLabel],
                [values]: groupOptions,
            }
            : [];
    });
}

const flow = (...fns) => (x) => fns.reduce((v, f) => f(v), x);

export default {
    data() {
        return {
            search: '',
            loading: false,
            isOpen: false,
            preferredOpenDirection: 'below',
            optimizedHeight: this.maxHeight,
            remoteResults: [],
            prefetched: false,
        };
    },
    props: {
        /**
         * Decide whether to filter the results based on search query.
         * Useful for async filtering, where we search through more complex data.
         * @type {Boolean}
         */
        internalSearch: {
            type: Boolean,
            default: true,
        },
        /**
         * Array of available options: Objects, Strings or Integers.
         * If array of objects, visible label will default to option.label.
         * If `labal` prop is passed, label will equal option['label']
         * @type {Array}
         */
        options: {
            type: Array,
            required: true,
        },
        /**
         * Equivalent to the `multiple` attribute on a `<select>` input.
         * @default false
         * @type {Boolean}
         */
        multiple: {
            type: Boolean,
            default: false,
        },
        /**
         * Presets the selected options value.
         * @type {Object||Array||String||Integer}
         */
        value: {
            type: null,
            default() {
                return [];
            },
        },
        /**
         * Key to compare objects
         * @default 'id'
         * @type {String}
         */
        optionID: {
            type: String,
            default: undefined,
        },
        /**
         * Label to look for in option Object
         * @default 'name'
         * @type {String}
         */
        optionLabel: {
            type: String,
        },
        /**
             * Whether input-emit should contains ids or objects
             * @default 'autodetected'
             * @type {String}
             */
            inputFormat: {
                type: String,
            },
        /**
         * Whether input-emit should contains ids or objects
         * @default 'same as inputformat'
         * @type {String}
         */
        outputFormat: {
            type: String,
        },
        /**
         * Sublabel to look for in option Object. Displayed on the right
         * @default ''
         * @type {String}
         */
        sublabel: {
            type: String,
        },
        /**
         * Class to apply on sublabel
         * @default ''
         * @type {String}
         */
        sublabelClass: {
            type: String,
        },
        /**
         * Enable/disable search in options
         * @default true
         * @type {Boolean}
         */
        searchable: {
            type: Boolean,
            default: true,
        },
        /**
         * Clear the search input after `)
         * @default true
         * @type {Boolean}
         */
        clearOnSelect: {
            type: Boolean,
            default: true,
        },
        /**
         * Allow clearing of selected values
         * @default false
         * @type {Boolean}
         */
        allowClear: {
            type: Boolean,
            default: false,
        },
        /**
         * Hide already selected options
         * @default true
         * @type {Boolean}
         */
        hideSelected: {
            type: Boolean,
            default: true,
        },
        /**
         * Equivalent to the `placeholder` attribute on a `<select>` input.
         * @default 'Select option'
         * @type {String}
         */
        placeholder: {
            type: String,
            default: '',
        },
        /**
         * Allow to remove all selected values
         * @default true
         * @type {Boolean}
         */
        allowEmpty: {
            type: Boolean,
            default: true,
        },
        /**
         * Reset this.internalValue, this.search after this.internalValue changes.
         * Useful if want to create a stateless dropdown.
         * @default false
         * @type {Boolean}
         */
        resetAfter: {
            type: Boolean,
            default: false,
        },
        /**
         * Enable/disable closing after selecting an option
         * @default true
         * @type {Boolean}
         */
        closeOnSelect: {
            type: Boolean,
            default: true,
        },
        /**
         * Function to interpolate the custom label
         * @default false
         * @type {Function}
         */
        customLabel: {
            type: Function,
            default(option, label) {
                if (isEmpty(option)) return '';
                return label ? option[label] : option;
            },
        },
        /**
         * Disable / Enable tagging
         * @default false
         * @type {Boolean}
         */
        taggable: {
            type: Boolean,
            default: false,
        },
        /**
         * By default new tags will appear above the search results.
         * Changing to 'bottom' will revert this behaviour
         * and will proritize the search results
         * @default 'top'
         * @type {String}
         */
        tagPosition: {
            type: String,
            default: 'top',
        },
        /**
         * Number of allowed selected options. No limit if 0.
         * @default 0
         * @type {Number}
         */
        max: {
            type: [Number, Boolean],
            default: false,
        },
        /**
         * Will be passed with all events as second param.
         * Useful for identifying events origin.
         * @default null
         * @type {String|Integer}
         */
        id: {
            default: null,
        },
        /**
         * Limits the options displayed in the dropdown
         * to the first X options.
         * @default 1000
         * @type {Integer}
         */
        optionsLimit: {
            type: Number,
            default: 1000,
        },
        /**
         * Name of the property containing
         * the group values
         * @default 1000
         * @type {String}
         */
        groupValues: {
            type: String,
        },
        /**
         * Name of the property containing
         * the group label
         * @type {String}
         */
        groupLabel: {
            type: String,
        },
        /**
         * Allow to select all group values
         * by selecting the group label
         * @default false
         * @type {Boolean}
         */
        groupSelect: {
            type: Boolean,
            default: false,
        },
        /**
         * Array of keyboard keys to block
         * when selecting
         * @type {String}
         */
        blockKeys: {
            type: Array,
            default() {
                return [];
            },
        },
        /**
         * Prevent from wiping up the search value
         * @default false
         * @type {Boolean}
         */
        preserveSearch: {
            type: Boolean,
            default: false,
        },
        /**
         * Select 1st options if value is empty
         * @default false
         * @type {Boolean}
         */
        preselectFirst: {
            type: Boolean,
            default: false,
        },

        /**
         * Execute api call for remote data
         * @type {Function}
         */
        remoteSearch: {
            type: Function,
            default: undefined,
        },

        /**
         * Execute remote search directly on opening
         * @type {Function}
         */
        prefetch: {
            type: Number,
            default: 0,
        },
    },
    mounted() {
        /* istanbul ignore else */
        if (!this.multiple && this.max) {
            console.warn(
                '[Vue-Multiselect warn]: Max prop should not be used when prop Multiple equals false.',
            );
        }
        if (this.preselectFirst && !this.internalValue.length && this.options.length) {
            this.select(this.filteredOptions[0]);
        }
    },
    computed: {
        formatInput() {
            if (this.inputFormat) { return this.inputFormat; }
            if (this.value || this.value === 0) {
                if (Array.isArray(this.value) && this.value.length) {
                    if (typeof this.value[0] === 'string') {
                        return 'string';
                    }
                    if (typeof this.value[0] === 'number') {
                        return 'id';
                    }
                } else {
                    if (typeof this.value === 'string') {
                        return 'string';
                    }
                    if (typeof this.value === 'number') {
                        return 'id';
                    }
                }
            }
            return 'object';
        },

        formatOutput() {
            if (this.outputFormat) { return this.outputFormat; }
            if (typeof this.remoteSearch === 'function') { return 'object'; }
            return this.formatInput;
        },

        internalValue() {
            if (this.value || this.value === 0) {
                if (this.formatInput === 'id') {
                    const findValueInOptions = (val) => this.options.find((it) => it[this.trackBy] === val);
                    if (Array.isArray(this.value)) {
                        return this.value.reduce((acc, cur) => {
                            const opt = findValueInOptions(cur);
                            if (opt) {
                                acc.push(opt);
                            }
                            return acc;
                        }, []);
                    }
                    return [findValueInOptions(this.value)] || [];
                }
                return Array.isArray(this.value) ? this.value : [this.value];
            }
            return [];
        },
        filteredOptions() {
            const search = this.search || '';
            const normalizedSearch = search.toLowerCase().trim();

            let options = !this.remoteSearch ? this.options.concat() : this.options.concat(this.remoteResults);

            /* istanbul ignore else */
            if (this.internalSearch && !this.remoteSearch) {
                options = this.groupValues
                    ? this.filterAndFlat(options, normalizedSearch, this.label)
                    : filterOptions(options, normalizedSearch, this.label, this.customLabel);
            } else {
                options = this.groupValues
                    ? flattenOptions(this.groupValues, this.groupLabel)(options)
                    : options;
            }

            options = this.hideSelected ? options.filter(not(this.isSelected)) : options;

            /* istanbul ignore else */
            if (
                this.taggable
                && normalizedSearch.length
                && !this.isExistingOption(normalizedSearch)
            ) {
                if (this.tagPosition === 'bottom') {
                    options.push({ isTag: true, label: search });
                } else {
                    options.unshift({ isTag: true, label: search });
                }
            }

            return options.slice(0, this.optionsLimit);
        },
        trackBy() {
            return typeof this.optionID === 'undefined' ? 'id' : this.optionID;
        },
        label() {
            return typeof this.optionLabel === 'undefined' ? 'name' : this.optionLabel;
        },
        valueKeys() {
            if (this.trackBy) {
                return this.internalValue.map((element) => (element && element[this.trackBy] ? element[this.trackBy] : undefined));
            }
            return this.internalValue;
        },
        optionKeys() {
            const options = this.groupValues ? this.flatAndStrip(this.options) : this.options;
            return options.map((element) => this.customLabel(element, this.label)
                .toString()
                .toLowerCase());
        },
        currentOptionLabel() {
            if (!this.multiple && this.internalValue.length) {
                return this.getOptionLabel(this.internalValue[0]);
            }
            return this.searchable ? '' : this.placeholder;
        },
    },
    watch: {
        internalValue() {
            /* istanbul ignore else */
            if (this.resetAfter && this.internalValue.length) {
                this.search = '';
                this.emitInput(this.multiple ? [] : undefined);
            }
        },
        search(val) {
            this.searchRemoteValues(val);
            // this.$emit('search-change', this.search, this.id);
        },
        prefetch() {
            this.prefetched = false;
        },
    },
    methods: {
        /**
         * Returns the internalValue in a way it can be emited to the parent
         * @returns {Object||Array||String||Integer}
         */
        getValue() {
            if (this.multiple) {
                return this.internalValue;
            }
            return this.internalValue.length === 0 ? undefined : this.internalValue[0];
        },

        searchRemoteValues: debounce(function debounced(val) {
            this.getRemoteValues(val);
        }, 500),

        getRemoteValues(val) {
            if (typeof this.remoteSearch === 'function') {
                if (val || (this.prefetch && !this.prefetched)) {
                    this.loading = true;
                    this.remoteSearch(val)
                        .then((r) => {
                            this.remoteResults = r;
                        }).catch(() => {
                            this.remoteResults = [];
                        }).finally(() => {
                            this.loading = false;
                        });
                } else if (!this.remoteResults.length) {
                    this.remoteResults = [];
                }
            }
        },
        /**
         * Filters and then flattens the options list
         * @param  {Array}
         * @returns {Array} returns a filtered and flat options list
         */
        filterAndFlat(options, search, label) {
            return flow(
                filterGroups(search, label, this.groupValues, this.groupLabel, this.customLabel),
                flattenOptions(this.groupValues, this.groupLabel),
            )(options);
        },
        /**
         * Flattens and then strips the group labels from the options list
         * @param  {Array}
         * @returns {Array} returns a flat options list without group labels
         */
        flatAndStrip(options) {
            return flow(flattenOptions(this.groupValues, this.groupLabel), stripGroups)(options);
        },
        /**
         * Updates the search value
         * @param  {String}
         */
        updateSearch(query) {
            this.search = query;
        },

        /**
         * Emits value in desired outputformat
         * @param  {Number||String||Object||Array}
         */
        emitInput(val) {
            if (val && this.formatOutput === 'id') {
                const ids = Array.isArray(val)
                    ? val.map((it) => it[this.trackBy])
                    : val[this.trackBy];
                this.$emit('input', ids, this.id);
            } else {
                this.$emit('input', val, this.id);
            }
            this.$emit('update', val, this.id);
        },
        /**
         * Finds out if the given query is already present
         * in the available options
         * @param  {String}
         * @returns {Boolean} returns true if element is available
         */
        isExistingOption(query) {
            return !this.options ? false : this.optionKeys.indexOf(query) > -1;
        },
        /**
         * Finds out if the given element is already present
         * in the result value
         * @param  {Object||String||Integer} option passed element to check
         * @returns {Boolean} returns true if element is selected
         */
        isSelected(option) {
            const opt = this.trackBy ? option[this.trackBy] : option;
            return this.valueKeys.indexOf(opt) > -1;
        },
        /**
         * Finds out if the given option is disabled
         * @param  {Object||String||Integer} option passed element to check
         * @returns {Boolean} returns true if element is disabled
         */
        isOptionDisabled(option) {
            return !!option.$isDisabled;
        },
        /**
         * Returns empty string when options is null/undefined
         * Returns tag query if option is tag.
         * Returns the customLabel() results and casts it to string.
         *
         * @param  {Object||String||Integer} Passed option
         * @param  {String} Key for sublabel
         * @returns {Object||String}
         */
        getOptionLabel(option, key) {
            if (isEmpty(option) || (key && (option.isTag || option.$isLabel))) return '';
            /* istanbul ignore else */
            if (option.isTag) return option.label;
            /* istanbul ignore else */
            if (option.$isLabel) return option.$groupLabel;
            if (!key && typeof option === 'string') {
                return option;
            }
            const label = this.customLabel(option, key || this.label);
            /* istanbul ignore else */
            if (isEmpty(label)) return '';
            return label;
        },
        /**
         * Add the given option to the list of selected options
         * or sets the option as the selected option.
         * If option is already selected -> remove it from the results.
         *
         * @param  {Object||String||Integer} option to select/deselect
         * @param  {Boolean} block removing
         */
        select(option, key) {
            /* istanbul ignore else */
            if (option.$isLabel && this.groupSelect) {
                this.selectGroup(option);
                return;
            }
            if (
                this.blockKeys.indexOf(key) !== -1
                || this.disabled
                || option.$isDisabled
                || option.$isLabel
            ) { return; }
            /* istanbul ignore else */
            if (this.max && this.multiple && this.internalValue.length === this.max) return;
            /* istanbul ignore else */
            if (key === 'Tab' && !this.pointerDirty) return;
            if (option.isTag) {
                if (this.inputFormat === 'string') {
                    option = option.label;
                } else {
                    option = { [this.trackBy]: option.label, [this.label]: option.label };
                }
                if (this.multiple) {
                    this.emitInput(this.internalValue.concat([option]));
                } else {
                    this.emitInput(option);
                }
                this.search = '';
                if (this.closeOnSelect && !this.multiple) this.deactivate();
            } else {
                const isSelected = this.isSelected(option);

                if (isSelected) {
                    if (key !== 'Tab') this.removeElement(option);
                    return;
                }

                this.$emit('select', option, this.id);

                if (this.multiple) {
                    this.emitInput(this.internalValue.concat([option]));
                } else {
                    this.emitInput(option);
                }

                /* istanbul ignore else */
                if (this.clearOnSelect) this.search = '';
            }
            /* istanbul ignore else */
            if (this.closeOnSelect && !(this.multiple && key === 'Enter')) this.deactivate();
        },
        /**
         * Add the given group options to the list of selected options
         * If all group optiona are already selected -> remove it from the results.
         *
         * @param  {Object||String||Integer} group to select/deselect
         */
        selectGroup(selectedGroup) {
            const group = this.options.find(
                (option) => option[this.groupLabel] === selectedGroup.$groupLabel,
            );

            if (!group) return;

            if (this.wholeGroupSelected(group)) {
                this.$emit('remove', group[this.groupValues], this.id);

                const newValue = this.internalValue.filter(
                    (option) => group[this.groupValues].indexOf(option) === -1,
                );

                this.emitInput(newValue);
            } else {
                const optionsToAdd = group[this.groupValues].filter(
                    (option) => !(this.isOptionDisabled(option) || this.isSelected(option)),
                );

                this.$emit('select', optionsToAdd, this.id);
                this.emitInput(this.internalValue.concat(optionsToAdd));
            }

            if (this.closeOnSelect) this.deactivate();
        },
        /**
         * Helper to identify if all values in a group are selected
         *
         * @param {Object} group to validated selected values against
         */
        wholeGroupSelected(group) {
            return group[this.groupValues].every(
                (option) => this.isSelected(option) || this.isOptionDisabled(option),
            );
        },
        /**
         * Helper to identify if all values in a group are disabled
         *
         * @param {Object} group to check for disabled values
         */
        wholeGroupDisabled(group) {
            return group[this.groupValues].every(this.isOptionDisabled);
        },
        /**
         * Removes the given option from the selected options.
         * Additionally checks this.allowEmpty prop if option can be removed when
         * it is the last selected option.
         *
         * @param  {type} option description
         * @returns {type}        description
         */
        removeElement(option, shouldClose = true) {
            /* istanbul ignore else */
            if (this.disabled) return;
            /* istanbul ignore else */
            if (option.$isDisabled) return;
            /* istanbul ignore else */
            if (!this.allowEmpty && this.internalValue.length <= 1) {
                this.deactivate();
                return;
            }

            const index = typeof option === 'object'
                ? this.valueKeys.indexOf(option[this.trackBy])
                : this.valueKeys.indexOf(option);

            this.$emit('remove', option, this.id);
            if (this.multiple) {
                const newValue = this.internalValue
                    .slice(0, index)
                    .concat(this.internalValue.slice(index + 1));
                this.emitInput(newValue);
            } else {
                this.emitInput(undefined);
            }

            /* istanbul ignore else */
            if (this.closeOnSelect && shouldClose) this.deactivate();
        },
        /**
         * Calls this.removeElement() with the last element
         * from this.internalValue (selected element Array)
         *
         * @fires this#removeElement
         */
        removeLastElement() {
            /* istanbul ignore else */
            if (this.blockKeys.indexOf('Delete') !== -1) return;
            /* istanbul ignore else */
            if (
                this.search.length === 0
                && Array.isArray(this.internalValue)
                && this.internalValue.length
            ) {
                this.removeElement(this.internalValue[this.internalValue.length - 1], false);
            }
        },

        removeAllElements(shouldClose = true) {
            /* istanbul ignore else */
            if (this.disabled) return;
            /* istanbul ignore else */
            if (!this.allowEmpty && this.internalValue.length <= 1) {
                this.deactivate();
                return;
            }
            this.internalValue.forEach((option) => {
                this.$emit('remove', option, this.id);
            });
            if (this.multiple) {
                this.emitInput([]);
            } else {
                this.emitInput(undefined);
            }

            if (this.closeOnSelect && shouldClose) this.deactivate();
        },
        /**
         * Opens the multiselect’s dropdown.
         * Sets this.isOpen to TRUE
         */
        activate() {
            /* istanbul ignore else */
            if (this.isOpen || this.disabled) return;

            this.adjustPosition();
            /* istanbul ignore else  */
            if (this.groupValues && this.pointer === 0 && this.filteredOptions.length) {
                this.pointer = 1;
            }

            if (this.prefetch && !this.prefetched) {
                this.getRemoteValues();
                this.prefetched = true;
            }

            this.isOpen = true;
            /* istanbul ignore else  */
            if (this.searchable) {
                if (!this.preserveSearch) this.search = '';
                this.$nextTick(() => this.$refs.search && this.$refs.search.focus());
            } else {
                this.$el.focus();
            }
            this.$emit('open', this.id);
        },
        /**
         * Closes the multiselect’s dropdown.
         * Sets this.isOpen to FALSE
         */
        deactivate() {
            /* istanbul ignore else */
            if (!this.isOpen) return;

            this.isOpen = false;
            /* istanbul ignore else  */
            if (this.searchable) {
                if (this.$refs.search) {
                    this.$refs.search.blur();
                }
            } else {
                this.$el.blur();
            }
            if (!this.preserveSearch) this.search = '';
            this.$emit('close', this.getValue(), this.id);
        },
        /**
         * Call this.activate() or this.deactivate()
         * depending on this.isOpen value.
         *
         * @fires this#activate || this#deactivate
         * @property {Boolean} isOpen indicates if dropdown is open
         */
        toggle() {
            if (this.isOpen) {
                this.deactivate();
            } else {
                this.activate();
            }
        },
        /**
         * Updates the hasEnoughSpace variable used for
         * detecting where to expand the dropdown
         */
        adjustPosition() {
            if (typeof window === 'undefined') return;

            const spaceAbove = this.$el.getBoundingClientRect().top;
            const spaceBelow = window.innerHeight - this.$el.getBoundingClientRect().bottom;
            const hasEnoughSpaceBelow = spaceBelow > this.maxHeight;

            if (
                hasEnoughSpaceBelow
                || spaceBelow > spaceAbove
                || this.openDirection === 'below'
                || this.openDirection === 'bottom'
            ) {
                this.preferredOpenDirection = 'below';
                this.optimizedHeight = Math.min(spaceBelow - 40, this.maxHeight);
            } else {
                this.preferredOpenDirection = 'above';
                this.optimizedHeight = Math.min(spaceAbove - 40, this.maxHeight);
            }
        },
    },
};
