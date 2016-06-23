<template>
  <div
    tabindex="0"
    :class="{ 'multiselect--active': isOpen }"
    @focus="activate()"
    @blur="searchable ? false : deactivate()"
    @keydown.self.down.prevent="pointerForward()"
    @keydown.self.up.prevent="pointerBackward()"
    @keydown.enter.stop.prevent.self="addPointerElement()"
    @keyup.esc="deactivate()"
    class="multiselect">
      <div @mousedown.prevent="toggle()" class="multiselect__select"></div>
      <div v-el:tags="v-el:tags" class="multiselect__tags">
        <span v-if="multiple" v-for="option in visibleValue" track-by="$index" onmousedown="event.preventDefault()" class="multiselect__tag">
          {{ getOptionLabel(option) }}
          <i aria-hidden="true" tabindex="1" @keydown.enter.prevent="removeElement(option)" @mousedown.prevent="removeElement(option)" class="multiselect__tag-icon"></i>
        </span>
        <template v-if="value && value.length > limit">
          <strong>{{ limitText(value.length - limit) }}</strong>
        </template>
        <div v-show="loading" transition="multiselect__loading" class="multiselect__spinner"></div>
        <input
          name="search"
          type="text"
          autocomplete="off"
          :placeholder="placeholder"
          v-el:search="v-el:search"
          v-if="searchable"
          v-model="search"
          @focus.prevent="activate()"
          @blur.prevent="deactivate()"
          @input="pointerReset()"
          @keyup.esc="deactivate()"
          @keyup.down="pointerForward()"
          @keyup.up="pointerBackward()"
          @keydown.enter.stop.prevent.self="addPointerElement()"
          @keydown.delete="removeLastElement()"
          class="multiselect__input"/>
          <span v-if="!searchable && !multiple" class="multiselect__single">{{ getOptionLabel(value) ? getOptionLabel(value) : placeholder }}</span>
      </div>
      <ul transition="multiselect" :style="{ maxHeight: maxHeight + 'px' }" v-el:list="v-el:list" v-show="isOpen" class="multiselect__content">
        <slot name="beforeList"></slot>
        <li v-if="multiple && max === value.length">
          <span class="multiselect__option">
            <slot name="maxElements">Maximum of {{ max }} options selected. First remove a selected option to select another.</slot>
          </span>
        </li>
        <template v-if="!max || value.length < max">
          <li v-for="option in filteredOptions" track-by="$index">
            <span
              tabindex="0"
              :class="{ 'multiselect__option--highlight': $index === pointer && this.showPointer, 'multiselect__option--selected': !isNotSelected(option) }"
              @mousedown.prevent="select(option)"
              @mouseover="pointerSet($index)"
              :data-select="option.isTag ? tagPlaceholder : selectLabel"
              :data-selected="selectedLabel"
              :data-deselect="deselectLabel"
              class="multiselect__option">
                {{ getOptionLabel(option) }}
            </span>
          </li>
        </template>
        <li v-show="filteredOptions.length === 0 && search.length">
          <span class="multiselect__option">
            <slot name="noResult">No elements found. Consider changing the search query.</slot>
          </span>
        </li>
        <slot name="afterList"></slot>
    </ul>
  </div>
</template>

<script>
  import multiselectMixin from './multiselectMixin'
  import pointerMixin from './pointerMixin'

  export default {
    mixins: [multiselectMixin, pointerMixin],
    props: {
      /**
       * String to show when pointing to an option
       * @default 'Press enter to select'
       * @type {String}
       */
      selectLabel: {
        type: String,
        default: 'Press enter to select'
      },
      /**
       * String to show next to selected option
       * @default 'Selected'
       * @type {String}
      */
      selectedLabel: {
        type: String,
        default: 'Selected'
      },
      /**
       * String to show when pointing to an alredy selected option
       * @default 'Press enter to remove'
       * @type {String}
      */
      deselectLabel: {
        type: String,
        default: 'Press enter to remove'
      },
      /**
       * Decide whether to show pointer labels
       * @default true
       * @type {Boolean}
      */
      showLabels: {
        type: Boolean,
        default: true
      },
      /**
       * Label to look for in option Object
       * @default 'label'
       * @type {String}
       */
      limit: {
        type: Number,
        default: 99999
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
        default: count => `and ${count} more`
      }
    },
    computed: {
      visibleValue () {
        return this.multiple
          ? this.value.slice(0, this.limit)
          : this.value
      }
    },
    ready () {
      /* istanbul ignore else */
      if (!this.showLabels) {
        this.deselectLabel = this.selectedLabel = this.selectLabel = ''
      }
    }
  }
</script>

<style>
.multiselect__spinner {
  position: absolute;
  right: 1px;
  top: 1px;
  width: 48px;
  height: 35px;
  background: #fff;
  display: block;
}

.multiselect__spinner:before,
.multiselect__spinner:after {
  position: absolute;
  content: "";
  top: 50%;
  left: 50%;
  margin: -8px 0 0 -8px;
  width: 16px;
  height: 16px;
  border-radius: 100%;
  border-color: #41B883 transparent transparent;
  border-style: solid;
  border-width: 2px;
  box-shadow: 0 0 0 1px transparent;
}

.multiselect__spinner:before {
  animation: spinning 2.4s cubic-bezier(0.41, 0.26, 0.2, 0.62);
  animation-iteration-count: infinite;
}

.multiselect__spinner:after {
  animation: spinning 2.4s cubic-bezier(0.51, 0.09, 0.21, 0.8);
  animation-iteration-count: infinite;
}

.multiselect__loading-transition {
  transition: opacity 0.4s ease-in-out;
  opacity: 1;
}

.multiselect__loading-enter,
.multiselect__loading-leave {
  opacity: 0;
}

.multiselect,
.multiselect__input,
.multiselect__single {
  font-family: inherit;
  font-size: 14px;
}

.multiselect {
  box-sizing: content-box;
  display: block;
  position: relative;
  width: 100%;
  min-height: 40px;
  text-align: left;
  color: #35495E;
}

.multiselect * {
  box-sizing: border-box;
}

.multiselect:focus {
  outline: none;
}

.multiselect--active {
  z-index: 50;
}

.multiselect--active .multiselect__current,
.multiselect--active .multiselect__input,
.multiselect--active .multiselect__tags {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.multiselect--active .multiselect__select {
  transform: rotateZ(180deg);
}

.multiselect__input,
.multiselect__single {
  position: relative;
  display: inline-block;
  min-height: 20px;
  line-height: 20px;
  border: none;
  border-radius: 5px;
  background: #fff;
  padding: 1px 0 0 5px;
  width: calc(100%);
  transition: border 0.1s ease;
  box-sizing: border-box;
  margin-bottom: 8px;
}

.multiselect__tag ~ .multiselect__input {
  width: auto;
}

.multiselect__input:hover,
.multiselect__single:hover {
  border-color: #cfcfcf;
}

.multiselect__input:focus,
.multiselect__single:focus {
  border-color: #a8a8a8;
  outline: none;
}

.multiselect__single {
  padding-left: 6px;
  margin-bottom: 8px;
}

.multiselect__tags {
  min-height: 40px;
  display: block;
  padding: 8px 40px 0 8px;
  border-radius: 5px;
  border: 1px solid #E8E8E8;
  background: #fff;
}

.multiselect__tag {
  position: relative;
  display: inline-block;
  padding: 4px 26px 4px 10px;
  border-radius: 5px;
  margin-right: 10px;
  color: #fff;
  line-height: 1;
  background: #41B883;
  margin-bottom: 8px;
}

.multiselect__tag-icon {
  cursor: pointer;
  margin-left: 7px;
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  font-weight: 700;
  font-style: initial;
  width: 22px;
  text-align: center;
  line-height: 22px;
  transition: all 0.2s ease;
  border-radius: 5px;
}

.multiselect__tag-icon:after {
  content: "×";
  color: #266d4d;
  font-size: 14px;
}

.multiselect__tag-icon:focus,
.multiselect__tag-icon:hover {
  background: #369a6e;
}

.multiselect__tag-icon:focus:after,
.multiselect__tag-icon:hover:after {
  color: white;
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
  border-radius: 5px;
  border: 1px solid #E8E8E8;
  cursor: pointer;
}

.multiselect__select {
  line-height: 16px;
  display: block;
  position: absolute;
  box-sizing: border-box;
  width: 40px;
  height: 38px;
  right: 1px;
  top: 1px;
  padding: 4px 8px;
  margin: 0;
  text-decoration: none;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.multiselect__select:before {
  position: relative;
  right: 0;
  top: 65%;
  color: #999;
  margin-top: 4px;
  border-style: solid;
  border-width: 5px 5px 0 5px;
  border-color: #999999 transparent transparent transparent;
  content: "";
}

.multiselect__placeholder {
  color: #ADADAD;
  display: inline-block;
  margin-bottom: 10px;
  padding-top: 2px;
}

.multiselect--active .multiselect__placeholder {
  display: none;
}

.multiselect__content {
  position: absolute;
  list-style: none;
  display: block;
  background: #fff;
  width: 100%;
  max-height: 240px;
  overflow: auto;
  padding: 0;
  margin: 0;
  border: 1px solid #E8E8E8;
  border-top: none;
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  z-index: 50;
}

.multiselect__content::webkit-scrollbar {
  display: none;
}

.multiselect__option {
  display: block;
  padding: 12px;
  min-height: 40px;
  line-height: 16px;
  text-decoration: none;
  text-transform: none;
  vertical-align: middle;
  position: relative;
  cursor: pointer;
}

.multiselect__option:after {
  top: 0;
  right: 0;
  position: absolute;
  line-height: 40px;
  padding-right: 12px;
  padding-left: 20px;
}

.multiselect__option--highlight {
  background: #41B883;
  outline: none;
  color: white;
}

.multiselect__option--highlight:after {
  content: attr(data-select);
  color: white;
}

.multiselect__option--selected {
  background: #F3F3F3;
  color: #35495E;
  font-weight: bold;
}

.multiselect__option--selected:after {
  content: attr(data-selected);
  color: silver;
}

.multiselect__option--selected.multiselect__option--highlight {
  background: #FF6A6A;
  color: #fff;
}

.multiselect__option--selected.multiselect__option--highlight:after {
  content: attr(data-deselect);
  color: #fff;
}

.multiselect--disabled {
  background: #ededed;
  pointer-events: none;
}

.multiselect--disabled .multiselect__current,
.multiselect--disabled .multiselect__select {
  background: #ededed;
  color: #a6a6a6;
}

.multiselect__option--disabled {
  background: #ededed;
  color: #a6a6a6;
  cursor: text;
  pointer-events: none;
}

.multiselect__option--disabled:visited {
  color: #a6a6a6;
}

.multiselect__option--disabled:hover,
.multiselect__option--disabled:focus {
  background: #3dad7b;
}

.multiselect-transition {
  transition: all 0.3s ease;
}

.multiselect-enter,
.multiselect-leave {
  opacity: 0;
  max-height: 0 !important;
}
</style>