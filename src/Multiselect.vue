<template>
    <div
        :tabindex="searchable ? -1 : tabindex"
        :class="{
            'multiselect--active': isOpen,
            'multiselect--disabled': disabled,
            'multiselect--above': isAbove,
        }"
        @focus="activate()"
        @blur="searchable ? false : deactivate()"
        @keydown.self.down.prevent="pointerForward()"
        @keydown.self.up.prevent="pointerBackward()"
        @keypress.enter.tab.stop.self="addPointerElement($event)"
        @keyup.esc="deactivate()"
        class="multiselect"
        role="combobox"
        :aria-owns="'listbox-' + id"
        :readonly="readonly"
    >
        <input v-if="required && !internalValue.length" type="text" class="multiselect__required" required />

        <slot name="caret" :toggle="toggle">
            <div @mousedown.prevent.stop="toggle()" class="multiselect__select"></div>
        </slot>
        <slot name="clear" :search="search">
            <div
                class="multiselect__clear"
                v-if="allowClear && internalValue.length && !disabled"
                @mousedown.prevent.stop="removeAllElements"
            />
        </slot>
        <div ref="tags" class="multiselect__tags">
            <slot
                name="selection"
                :search="search"
                :remove="removeElement"
                :values="visibleValues"
                :is-open="isOpen"
            >
                <div class="multiselect__tags-wrap" v-show="visibleValues.length > 0">
                    <template v-for="(option, index) of visibleValues" @mousedown.prevent>
                        <slot name="tag" :option="option" :search="search" :remove="removeElement">
                            <span class="multiselect__tag" :key="index">
                                <span v-text="getOptionLabel(option)"></span>
                                <i
                                    tabindex="1"
                                    @keypress.enter.prevent="removeElement(option)"
                                    @mousedown.prevent="removeElement(option)"
                                    class="multiselect__tag-icon"
                                ></i>
                            </span>
                        </slot>
                    </template>
                </div>
                <template v-if="internalValue && internalValue.length > limit">
                    <slot name="limit">
                        <strong
                            class="multiselect__strong"
                            v-text="limitText(internalValue.length - limit)"
                        />
                    </slot>
                </template>
            </slot>
            <transition name="multiselect__loading">
                <slot name="loading">
                    <div v-show="loading" class="multiselect__spinner" />
                </slot>
            </transition>
            <input
                ref="search"
                v-if="searchable"
                :name="name"
                :id="id"
                type="text"
                autocomplete="off"
                spellcheck="false"
                :placeholder="placeholder"
                :style="inputStyle"
                :value="search"
                :disabled="disabled"
                :tabindex="tabindex"
                @input="updateSearch($event.target.value)"
                @focus.prevent="activate()"
                @blur.prevent="deactivate()"
                @keyup.esc="deactivate()"
                @keydown.down.prevent="pointerForward()"
                @keydown.up.prevent="pointerBackward()"
                @keypress.enter.prevent.stop.self="addPointerElement($event)"
                @keydown.delete.stop="removeLastElement()"
                class="multiselect__input"
                :aria-controls="'listbox-' + id"
            />
            <span
                v-if="isSingleLabelVisible"
                class="multiselect__single"
                @mousedown.prevent="toggle"
            >
                <slot name="singleLabel" :option="singleValue">
                    <template>{{ currentOptionLabel }}</template>
                </slot>
            </span>
            <span
                v-if="isPlaceholderVisible"
                class="multiselect__placeholder"
                @mousedown.prevent="toggle"
            >
                <slot name="placeholder">
                    {{ placeholder }}
                </slot>
            </span>
        </div>
        <transition name="multiselect">
            <div
                class="multiselect__content-wrapper"
                v-show="isOpen"
                @focus="activate"
                tabindex="-1"
                @mousedown.prevent
                :style="{ maxHeight: optimizedHeight + 'px' }"
                ref="list"
            >
                <ul
                    class="multiselect__content"
                    :style="contentStyle"
                    role="listbox"
                    :id="'listbox-' + id"
                >
                    <slot name="beforeList"></slot>
                    <li v-if="multiple && max === internalValue.length">
                        <span class="multiselect__option">
                            <slot name="maxElements"
                                >Maximum of {{ max }} options selected. First remove a selected
                                option to select another.</slot
                            >
                        </span>
                    </li>
                    <template v-if="!max || internalValue.length < max">
                        <li
                            class="multiselect__element"
                            v-for="(option, index) of filteredOptions"
                            :key="index"
                            v-bind:id="id + '-' + index"
                            v-bind:role="
                                !(option && (option.$isLabel || option.$isDisabled))
                                    ? 'option'
                                    : null
                            "
                        >
                            <span
                                v-if="
                                    !(option && (option.$isLabel || option.$isDisabled)) &&
                                        (option[trackBy] !== 0 || option[label])
                                "
                                @click.stop="select(option)"
                                @mouseenter.self="pointerSet(index)"
                                :data-select="
                                    option && option.isTag ? tagPlaceholder : selectLabelText
                                "
                                :data-selected="selectedLabelText"
                                :data-deselect="deselectLabelText"
                                class="multiselect__option"
                                :class="[
                                    'multiselect--level-' + (option.level || 0),
                                    optionHighlight(index, option),
                                ]"
                            >
                                <slot name="option" :option="option" :search="search">
                                    <span>{{ getOptionLabel(option) }}</span>
                                    <span
                                        v-if="sublabel"
                                        class="multiselect__option_sublabel"
                                        :class="sublabelClass"
                                        >{{ getOptionLabel(option, sublabel) }}</span
                                    >
                                </slot>
                            </span>
                            <span
                                v-else-if="option && (option.$isLabel || option.$isDisabled)"
                                :data-select="groupSelect && selectGroupLabelText"
                                :data-deselect="groupSelect && deselectGroupLabelText"
                                :class="groupHighlight(index, option)"
                                @mouseenter.self="groupSelect && pointerSet(index)"
                                @mousedown.prevent="selectGroup(option)"
                                class="multiselect__option"
                            >
                                <slot name="option" :option="option" :search="search">
                                    <span>{{ getOptionLabel(option) }}</span>
                                </slot>
                            </span>
                        </li>
                    </template>
                    <li
                        v-show="showNoResults && filteredOptions.length === 0 && search && !loading"
                    >
                        <span class="multiselect__option">
                            <slot name="noResult" :search="search">{{ translations.noResults }}</slot>
                        </span>
                    </li>
                    <li v-show="showNoOptions && options.length === 0 && !search && !loading">
                        <span class="multiselect__option">
                            <slot name="noOptions">
                                <template v-if="remoteSearch && taggable">{{ translations.remoteSearchTag }}</template>
                                <template v-else-if="remoteSearch">{{ translations.remoteSearch }}</template>
                                <template v-else>{{ translations.noOptions }}</template>
                            </slot>
                        </span>
                    </li>
                    <slot name="afterList"></slot>
                </ul>
            </div>
        </transition>
    </div>
</template>

<script>
import multiselectMixin from './multiselectMixin';
import pointerMixin from './pointerMixin';

export default {
    name: 'vue-multiselect',
    mixins: [multiselectMixin, pointerMixin],
    props: {
        /**
         * name attribute to match optional label element
         * @default ''
         * @type {String}
         */
        name: {
            type: String,
            default: '',
        },

        /**
         * name attribute to match optional label element
         * @default ''
         * @type {String}
         */
        lang: {
            type: String,
            default: 'nl',
        },
        /**
         * Decide whether to show pointer labels
         * @default true
         * @type {Boolean}
         */
        showLabels: {
            type: Boolean,
            default: true,
        },
        /**
         * Limit the display of selected options. The rest will be hidden within the limitText string.
         * @default 99999
         * @type {Integer}
         */
        limit: {
            type: Number,
            default: 99999,
        },
        /**
         * Sets maxHeight style value of the dropdown
         * @default 300
         * @type {Integer}
         */
        maxHeight: {
            type: Number,
            default: 300,
        },
        /**
         * Function that process the message shown when selected
         * elements pass the defined limit.
         * @default 'and * more'
         * @param {Int} count Number of elements more than limit
         * @type {Function}
         */
        limitText: {
            type: Function,
            default: (count) => `and ${count} more`,
        },
        /**
         * Disables the multiselect if true.
         * @default false
         * @type {Boolean}
         */
        readonly: {
            type: Boolean,
            default: false,
        },
        /**
         * Sets required-input attribute
         * @default false
         * @type {Boolean}
         */
        required: {
            type: Boolean,
            default: false,
        },
        /**
         * Fixed opening direction
         * @default ''
         * @type {String}
         */
        openDirection: {
            type: String,
            default: '',
        },
        /**
         * Shows slot with message about empty options
         * @default true
         * @type {Boolean}
         */
        showNoOptions: {
            type: Boolean,
            default: true,
        },
        showNoResults: {
            type: Boolean,
            default: true,
        },
        tabindex: {
            type: Number,
            default: 0,
        },
    },
    computed: {
        disabled() {
            return this.readonly;
        },
        isSingleLabelVisible() {
            return (
                (this.singleValue || this.singleValue === 0)
                && (!this.isOpen || !this.searchable)
                && !this.visibleValues.length
            );
        },
        isPlaceholderVisible() {
            return !this.internalValue.length && (!this.searchable || !this.isOpen);
        },
        visibleValues() {
            return this.multiple ? this.internalValue.slice(0, this.limit) : [];
        },
        singleValue() {
            return this.internalValue[0];
        },
        deselectLabelText() {
            return this.showLabels ? this.deselectLabel : '';
        },
        deselectGroupLabelText() {
            return this.showLabels ? this.deselectGroupLabel : '';
        },
        selectLabelText() {
            return this.showLabels ? this.selectLabel : '';
        },
        selectGroupLabelText() {
            return this.showLabels ? this.selectGroupLabel : '';
        },
        selectedLabelText() {
            return this.showLabels ? this.selectedLabel : '';
        },
        inputStyle() {
            if (this.searchable || (this.multiple && this.value && this.value.length)) {
                // Hide input by setting the width to 0 allowing it to receive focus
                return this.isOpen
                    ? { width: '100%' }
                    : { width: '0', position: 'absolute', padding: '0' };
            }
            return {};
        },
        contentStyle() {
            return this.options.length ? { display: 'inline-block' } : { display: 'block' };
        },
        isAbove() {
            if (this.openDirection === 'above' || this.openDirection === 'top') {
                return true;
            }
            if (this.openDirection === 'below' || this.openDirection === 'bottom') {
                return false;
            }
            return this.preferredOpenDirection === 'above';
        },
        showSearchInput() {
            return (
                this.searchable
                && (this.hasSingleSelectedSlot
                && (this.visibleSingleValue || this.visibleSingleValue === 0)
                    ? this.isOpen
                    : true)
            );
        },

        selectLabel() { return this.translations.selectLabel; },
        selectGroupLabel() { return this.translations.selectGroupLabel; },
        selectedLabel() { return this.translations.selectedLabel; },
        deselectLabel() { return this.translations.deselectLabel; },
        deselectGroupLabel() { return this.translations.deselectGroupLabel; },
        tagPlaceholder() { return this.translations.tagPlaceholder; },

        translations() {
            const data = {
                en: {
                    noResults: 'No results',
                    noOptions: 'No options available',
                    selectLabel: '',
                    selectGroupLabel: 'Press enter to select group',
                    selectedLabel: 'Selected',
                    deselectLabel: 'Add',
                    deselectGroupLabel: '',
                    tagPlaceholder: 'Add',
                    remoteSearchTag: 'Add an item',
                    remoteSearch: 'Type to search',
                },
                nl: {
                    noResults: 'Geen resultaten',
                    noOptions: 'Geen opties beschikbaar',
                    selectLabel: '',
                    selectGroupLabel: 'Selecteer met enter',
                    selectedLabel: 'Geselecteerd',
                    deselectLabel: 'Toevoegen',
                    deselectGroupLabel: '',
                    tagPlaceholder: 'Toevoegen',
                    remoteSearchTag: 'Voeg een item toe',
                    remoteSearch: 'Typ om te zoeken',
                },
            };
            if (Object.keys(data).includes(this.lang)) {
                return data[this.lang];
            }
            return data.nl;
        },
    },
};
</script>

<style>
.multiselect {
    --default-multiselect-input-bg: #fff;
    --default-multiselect-input-fontsize: 1.6rem;
    --default-multiselect-input-height: 40px;
    --default-multiselect-input-leftpadding: 0.8rem;
    --default-multiselect-border-color: #ccc;
    --default-multiselect-border-radius: 0.4rem;
    --default-multiselect-border-width: 0.1rem;
    --default-multiselect-color: #212121;
    --default-multiselect-color-secondary: #757575;
    --default-multiselect-color-tertiary: #9e9e9e;
    --default-multiselect-tag-bg: #ccc;
    --default-multiselect-tag-fontsize: 1.4rem;
    --default-multiselect-tag-color: #212121;
    --default-multiselect-highlight-bg: darkblue;
    --default-multiselect-highlight-color: white;
    --default-multiselect-level-indent: 0.8rem;

}

fieldset[disabled] .multiselect {
    pointer-events: none;
}

.multiselect__spinner {
    position: absolute;
    right: 1px;
    top: 1px;
    width: 48px;
    height: 35px;
    background: var(--multiselect-input-bg, var(--default-multiselect-input-bg));
    border-radius: var(--multiselect-border-radius, var(--default-multiselect-border-radius));
    display: block;
    z-index: 1;
}

.multiselect__spinner:before,
.multiselect__spinner:after {
    position: absolute;
    content: '';
    top: 50%;
    left: 50%;
    margin: -8px 0 0 -8px;
    width: 16px;
    height: 16px;
    border-radius: 100%;
    border-color: var(--multiselect-color-secondary, var(--default-multiselect-color-secondary)) transparent transparent;
    border-style: solid;
    border-width: 2px;
}

.multiselect__spinner:before {
    animation: spinning 2.4s cubic-bezier(0.41, 0.26, 0.2, 0.62);
    animation-iteration-count: infinite;
}

.multiselect__spinner:after {
    animation: spinning 2.4s cubic-bezier(0.51, 0.09, 0.21, 0.8);
    animation-iteration-count: infinite;
}

.multiselect__loading-enter-active,
.multiselect__loading-leave-active {
    transition: opacity 0.4s ease-in-out;
    opacity: 1;
}

.multiselect__loading-enter,
.multiselect__loading-leave-active {
    opacity: 0;
}

.multiselect,
.multiselect__input,
.multiselect__single {
    font-family: inherit;
    font-size: var(--multiselect-input-fontsize, var(--default-multiselect-input-fontsize));
    touch-action: manipulation;
}

.multiselect {
    box-sizing: content-box;
    display: block;
    position: relative;
    width: 100%;
    min-height: 40px;
    line-height: normal;
    text-align: left;
    color: var(--multiselect-color, var(--default-multiselect-color));
}
.multiselect__required {
    pointer-events: none;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    opacity: 0;
}

.multiselect * {
    box-sizing: border-box;
}

.multiselect:focus {
    outline: none;
}

.multiselect--disabled {
    pointer-events: none;
}

.multiselect--active {
    z-index: 50;
}

.multiselect--active:not(.multiselect--above) .multiselect__current,
.multiselect--active:not(.multiselect--above) .multiselect__input,
.multiselect--active:not(.multiselect--above) .multiselect__tags {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
}

.multiselect--active .multiselect__select {
    transform: rotateZ(180deg);
}

.multiselect--above.multiselect--active .multiselect__current,
.multiselect--above.multiselect--active .multiselect__input,
.multiselect--above.multiselect--active .multiselect__tags {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
}

.multiselect__input,
.multiselect__single {
    --YBorderWidth: calc(var(--multiselect-border-width, var(--default-multiselect-border-width)) * 2);
    --height: var(--multiselect-input-height, var(--default-multiselect-input-height));
    position: relative;
    display: block;
    min-height: 20px;
    border: none;
    border-radius: var(--multiselect-border-radius, var(--default-multiselect-border-radius));
    background: var(--multiselect-input-bg, var(--default-multiselect-input-bg));
    padding: 0 0 0 0;
    width: 100%;
    max-width: 100%;
    transition: border 0.1s ease;
    box-sizing: border-box;
    margin-bottom: 0;
    height: calc(var(--height) - var(--YBorderWidth));
    line-height: calc(var(--height) - var(--YBorderWidth));
}
.multiselect__tag ~ .multiselect__input,
.multiselect__tag ~ .multiselect__single {
    width: auto;
}

.multiselect__input:focus,
.multiselect__single:focus {
    outline: none;
}

.multiselect__single {
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    line-height: var(--multiselect-input-height, var(--default-multiselect-input-height));
}


.multiselect__tags {
    min-height: var(--multiselect-input-height, var(--default-multiselect-input-height));
    display: block;
    padding: 0 27px 0 var(--multiselect-input-leftpadding, var(--default-multiselect-input-leftpadding));
    border-radius: var(--multiselect-border-radius, var(--default-multiselect-border-radius));
    border: var(--multiselect-border-width, var(--default-multiselect-border-width)) solid var(--multiselect-border-color, var(--default-multiselect-border-color));
    background: var(--multiselect-input-bg, var(--default-multiselect-input-bg));
    font-size: var(--multiselect-input-fontsize, var(--default-multiselect-input-fontsize));
}
.multiselect__tags-wrap {
    margin-left: calc(-1 * var(--multiselect-input-leftpadding, var(--default-multiselect-input-leftpadding)));
    padding: 0 0 4px calc(0.5 * var(--multiselect-input-leftpadding, var(--default-multiselect-input-leftpadding)));
    display: flex;
    flex-wrap: wrap;
}
.multiselect__tag {
    position: relative;
    padding: 0 21px 0 10px;
    border-radius: var(--multiselect-border-radius, var(--default-multiselect-border-radius));
    margin-right: 4px;
    color: var(--multiselect-tag-color, var(--default-multiselect-tag-color));
    background: var(--multiselect-tag-bg, var(--default-multiselect-tag-bg));
    font-size: var(--multiselect-tag-fontsize, var(--default-multiselect-tag-fontsize));
    line-height: 30px;
    margin-top: 4px;
    white-space: nowrap;
    overflow: hidden;
    max-width: 100%;
    text-overflow: ellipsis;
}

.multiselect__tag-icon {
    cursor: pointer;
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    font-style: initial;
    width: 22px;
    text-align: center;
    transition: all 0.2s ease;
}

.multiselect__tag-icon:after {
    content: '×';
    color: var(--multiselect-color-secondary, var(--default-multiselect-color-secondary));
}

.multiselect__tag-icon:focus:after,
.multiselect__tag-icon:hover:after {
    color: var(--multiselect-tag-color, var(--default-multiselect-tag-color));
}

.multiselect__current {
    line-height: 16px;
    min-height: 40px;
    box-sizing: border-box;
    display: block;
    overflow: hidden;
    padding: 8px 12px 0;
    padding-right: 30px;
    white-space: nowrap;
    margin: 0;
    text-decoration: none;
    border-radius: var(--multiselect-border-radius, var(--default-multiselect-border-radius));
    border: var(--multiselect-border-width, var(--default-multiselect-border-width)) solid var(--multiselect-border-color, var(--default-multiselect-border-color));
    cursor: pointer;
}

.multiselect__select {
    line-height: 16px;
    display: block;
    position: absolute;
    box-sizing: border-box;
    width: 30px;
    height: 38px;
    right: 1px;
    top: 1px;
    padding: 4px 8px;
    margin: 0;
    text-decoration: none;
    text-align: center;
    cursor: pointer;
    transition: transform 0.2s ease;
    background-color: transparent;
}
    .multiselect--disabled .multiselect__select { display: none; }

.multiselect__select:before {
    position: relative;
    right: 0;
    top: 65%;
    color: #999;
    margin-top: 4px;
    border-style: solid;
    border-width: 5px 5px 0 5px;
    border-color: var(--multiselect-color-secondary, var(--default-multiselect-color-secondary)) transparent transparent transparent;
    content: '';
}

.multiselect__placeholder {
    color: var(--multiselect-color-tertiary, var(--default-multiselect-color-tertiary));
    display: block;
    line-height: var(--multiselect-input-height, var(--default-multiselect-input-height));
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
}

.multiselect--active .multiselect__placeholder {
    display: none;
}

.multiselect__content-wrapper {
    position: absolute;
    display: block;
    background: var(--multiselect-input-bg, var(--default-multiselect-input-bg));
    width: 100%;
    max-height: 70vh;
    overflow: auto;
    overflow-x: hidden;
    border: var(--multiselect-border-width, var(--default-multiselect-border-width)) solid var(--multiselect-border-color, var(--default-multiselect-border-color));
    border-top-width: 0;
    border-bottom-left-radius: calc(0.5 * var(--multiselect-border-radius, var(--default-multiselect-border-radius)));
    border-bottom-right-radius: calc(0.5 * var(--multiselect-border-radius, var(--default-multiselect-border-radius)));
    z-index: 50;
    -webkit-overflow-scrolling: touch;
}

.multiselect__content {
    list-style: none;
    display: inline-block;
    padding: 0;
    margin: 0;
    min-width: 100%;
    vertical-align: top;
}

.multiselect--above .multiselect__content-wrapper {
    bottom: 100%;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border-top-left-radius: calc(0.5 * var(--multiselect-border-radius, var(--default-multiselect-border-radius)));
    border-top-right-radius: calc(0.5 * var(--multiselect-border-radius, var(--default-multiselect-border-radius)));
    border-bottom-width: 0;
    border-top-width: var(--multiselect-border-width, var(--default-multiselect-border-width));
}

.multiselect__content::webkit-scrollbar {
    display: none;
}

.multiselect__element {
    display: block;
}

.multiselect__option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    min-height: 40px;
    line-height: 16px;
    text-decoration: none;
    text-transform: none;
    vertical-align: middle;
    position: relative;
    cursor: pointer;
    white-space: nowrap;
}

.multiselect__option:after {
    top: 0;
    right: 0;
    position: absolute;
    line-height: 40px;
    padding-right: 12px;
    padding-left: 20px;
    font-size: 13px;
}

.multiselect__option--highlight {
    background: var(--multiselect-highlight-bg, var(--default-multiselect-highlight-bg));
    color: var(--multiselect-highlight-color, var(--default-multiselect-highlight-color));
    outline: none;
}

.multiselect__option--highlight:after {
    content: attr(data-select);
    background: var(--multiselect-highlight-bg, var(--default-multiselect-highlight-bg));
    color: var(--multiselect-highlight-color, var(--default-multiselect-highlight-color));
}

/* .multiselect__option--selected {
    background: #f3f3f3;
    color: #35495e;
    font-weight: bold;
} */

/* .multiselect__option--selected:after {
    content: attr(data-selected);
    color: silver;
} */

/* .multiselect__option--selected.multiselect__option--highlight {
    background: #ff6a6a;
    color: #fff;
}

.multiselect__option--selected.multiselect__option--highlight:after {
    background: #ff6a6a;
    content: attr(data-deselect);
    color: #fff;
} */

/* start here */
.multiselect--disabled .multiselect__current,
.multiselect--disabled .multiselect__select {
    background: var(--multiselect-border-color, var(--default-multiselect-border-color)) !important;
    color: var(--multiselect-color-secondary, var(--default-multiselect-color-secondary)) !important;
}

.multiselect__option--disabled {
    background: var(--multiselect-border-color, var(--default-multiselect-border-color)) !important;
    color: var(--multiselect-color-secondary, var(--default-multiselect-color-secondary)) !important;
    cursor: text;
    pointer-events: none;
}
.multiselect__option_sublabel {
    font-size: var(--multiselect-tag-fontsize, var(--default-multiselect-tag-fontsize));
    color: var(--multiselect-color-secondary, var(--default-multiselect-color-secondary));
    padding-left: var(--multiselect-level-indent, var(--default-multiselect-level-indent));
}
.multiselect--level-1 {
    padding-left: var(--multiselect-level-indent, var(--default-multiselect-level-indent));
}
.multiselect--level-2 {
    padding-left: calc(2 * var(--multiselect-level-indent, var(--default-multiselect-level-indent)));
}

.multiselect__option--group {
    background: var(--multiselect-border-color, var(--default-multiselect-border-color));
    color: var(--multiselect-color, var(--default-multiselect-color));
}

.multiselect__option--group.multiselect__option--highlight {
    background: #35495e;
    color: #fff;
}

.multiselect__option--group.multiselect__option--highlight:after {
    background: #35495e;
}

.multiselect__option--disabled.multiselect__option--highlight {
    background: #dedede;
}

.multiselect__option--group-selected.multiselect__option--highlight {
    background: #ff6a6a;
    color: #fff;
}

.multiselect__option--group-selected.multiselect__option--highlight:after {
    background: #ff6a6a;
    content: attr(data-deselect);
    color: #fff;
}
/* end here */

.multiselect-enter-active,
.multiselect-leave-active {
    transition: all 0.15s ease;
}

.multiselect-enter,
.multiselect-leave-active {
    opacity: 0;
}

.multiselect__strong {
    margin-bottom: 8px;
    line-height: 20px;
    display: inline-block;
    vertical-align: top;
}

.multiselect__clear {
    position: absolute;
    right: 31px;
    height: 40px;
    width: 20px;
    display: block;
    cursor: pointer;
    z-index: 2;
}
.multiselect__clear:after,
.multiselect__clear:before {
    content: '';
    display: block;
    position: absolute;
    width: 2px;
    height: 14px;
    background: var(--multiselect-color-secondary, var(--default-multiselect-color-secondary));
    top: 13px;
    right: 4px;
}
.multiselect__clear:before {
    transform: rotate(45deg);
}
.multiselect__clear:after {
    transform: rotate(-45deg);
}

*[dir='rtl'] .multiselect {
    text-align: right;
}

*[dir='rtl'] .multiselect__select {
    right: auto;
    left: 1px;
}

*[dir='rtl'] .multiselect__tags {
    padding: 8px 8px 0px 40px;
}

*[dir='rtl'] .multiselect__content {
    text-align: right;
}

*[dir='rtl'] .multiselect__option:after {
    right: auto;
    left: 0;
}

*[dir='rtl'] .multiselect__clear {
    right: auto;
    left: 12px;
}

*[dir='rtl'] .multiselect__spinner {
    right: auto;
    left: 1px;
}

@keyframes spinning {
    from {
        transform: rotate(0);
    }
    to {
        transform: rotate(2turn);
    }
}
</style>
