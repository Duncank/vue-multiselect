<template lang="pug">
div
  label.typo__label(for="ajax") Async multiselect
  multiselect(
    v-model="selectedCountries",
    id="ajax",
    label="name",
    track-by="code",
    placeholder="Type to search",
    open-direction="bottom",
    :options="countries",
    :multiple="true",
    :searchable="true",
    :loading="isLoading",
    :internal-search="false",
    :clear-on-select="false",
    :close-on-select="false",
    :options-limit="300",
    :limit="3",
    :limit-text="limitText",
    :max-height="600",
    :show-no-results="false",
    :hide-selected="true",
    @search-change="asyncFind"
  )
    template(slot="tag", slot-scope="{ option, remove }")
      span.custom__tag
        span {{ option.name }}
        span.custom__remove(@click="remove(option)") ❌
    template(slot="clear", slot-scope="props")
      div.multiselect__clear(
        v-if="selectedCountries.length",
        @mousedown.prevent.stop="clearAll(props.search)"
      )
    span(slot="noResult").
      Oops! No elements found. Consider changing the search query.
  pre.language-json
    code.
      {{ selectedCountries  }}
</template>

<script>
import Multiselect from 'vue-multiselect'
import { ajaxFindCountry } from './countriesApi'

export default {
  components: {
    Multiselect
  },
  data () {
    return {
      selectedCountries: [],
      countries: [],
      isLoading: false
    }
  },
  methods: {
    limitText (count) {
      return `and ${count} other countries`
    },
    asyncFind (query) {
      this.isLoading = true
      ajaxFindCountry(query).then(response => {
        this.countries = response
        this.isLoading = false
      })
    },
    clearAll () {
      this.selectedCountries = []
    }
  }
}
</script>