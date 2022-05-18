(function () {
  /** @type {Set<HTMLElement>} */
  const hiddenElements = new Set();

  // Includes processed by grunt-include-replace.
  var cssTemplate = '<style>@@include("style.min.css")</style>';
  var formTemplate = '@@include("../temp/html/form.html")';

  // If not already done, attach the CSS to the head and the overlay markup to the body.
  /** @type {HTMLDivElement} */
  let gdf = document.querySelector('#gdf');
  if (!gdf) {
    appendStyles();
    appendFilterForm();
    appendViewedCheckboxes();
    appendPathFilters();

    /** @type {HTMLInputElement} */
    const txtFilter = document.querySelector('#gdf-hide-input');
    /** @type {HTMLAnchorElement} */
    const btnHide = document.querySelector('#gdf-hide-btn');
    /** @type {HTMLButtonElement} */
    const btnShowAll = document.querySelector('#gdf-show-all-btn');
    /** @type {HTMLAnchorElement} */
    const btnClose = document.querySelector('#gdf-close-btn');

    function appendStyles() {
      document.head.append(
        document.createRange().createContextualFragment(cssTemplate)
      );
    }

    function appendFilterForm() {
      document.querySelector('.toc-diff-stats').append(
        document.createRange().createContextualFragment(formTemplate)
      );
      gdf = document.querySelector("#gdf");
    }

    function applyFilter() {
      var query = txtFilter.value;

      if (query !== '') {
        query.split(',').forEach(filterPath);

        btnShowAll.disabled = false;
        txtFilter.value = '';
        txtFilter.focus();
      }
    };

    /**
     * 
     * @param {string} path 
     */
    function filterPath(path) {
      hideTableOfContentsEntry(path);
      hideDiffEntry(path);
      updateCounts();
    }

    /**
     * 
     * @param {string} path 
     */
    function hideTableOfContentsEntry(path) {
      [...document.querySelectorAll('#toc a[href^="#diff"]')]
        .filter(el => el.textContent.match(path))
        .map(el => el.closest('li'))
        .forEach(hide)
    }

    /**
     * 
     * @param {string} path 
     */
    function hideDiffEntry(path) {
      [...document.querySelectorAll(`[data-tagsearch-path]`)]
        .filter(el => el.attributes['data-tagsearch-path']?.value.match(path))
        .forEach(hide)
    }

    /**
     * 
     * @param {HTMLElement} element 
     */
    function hide(element) {
      if (!hiddenElements.has(element)) {
        element.hidden = true;
        hiddenElements.add(element);
      }
    }

    function showAll() {
      hiddenElements.forEach(el => el.hidden = false)
      hiddenElements.clear();
      btnShowAll.disabled = true;
    };

    btnHide.addEventListener('click', applyFilter);
    txtFilter.addEventListener('keyup', (event) => (event.key === 'Enter') && applyFilter());
    btnShowAll.addEventListener('click', showAll);
    btnClose.addEventListener('click', function () {
      gdf.hidden = true;
    });
  }
  
  gdf.hidden = true;
})();
