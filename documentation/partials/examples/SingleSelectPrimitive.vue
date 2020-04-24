<template lang="pug">
div
  label.typo__label Single select
  multiselect(
    v-model="value",
    :options="options",
    :searchable="false",
    :close-on-select="true",
    :allow-clear="true"
    :show-labels="false"
    placeholder="Pick a value"
    :multiple="true"
    track-by=""
    label=""
  )
  pre.language-json
    code.
      {{ value  }}
</template>

<script>
import Multiselect from 'vue-multiselect'

export default {
  components: {
    Multiselect
  },
  data () {
    return {
      value: [12, 21],
    //   options: [
    //     {
    //         id: 12,
    //         name: 'Duncan',
    //         extra: 'Krebbers'
    //     },
    //     {
    //         id: 13,
    //         name: 'Desiree',
    //         extra: 'van Vliet'
    //     },
    //     {
    //         id: 21,
    //         name: 'Tim',
    //         extra: 'Ramakers'
    //     }
    //   ]
      options: ['Select option', 'options', 'selected', 'multiple', 'label', 'searchable', 'clearOnSelect', 'hideSelected', 'maxHeight', 'allowEmpty', 'showLabels', 'onChange', 'touched']
    }
  }
}
</script>
