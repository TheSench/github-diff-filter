const test = require('test')

(function () {
  /** @type {Set<HTMLElement>} */
  const hiddenElements = new Set();

  // Includes processed by grunt-include-replace.
  var cssTemplate = '<style>@@include("style.min.css")</style>';
  var formTemplate = '@@include("../temp/html/form.html")';
  var viewedTemplate = '@@include("../temp/html/viewed.html")';

  // If not already done, attach the CSS to the head and the overlay markup to the body.
  /** @type {HTMLDivElement} */
  let gdf = document.querySelector('#gdf');
  if (!gdf) {
    appendStyles();
    appendFilterForm();
    addFormListeners();
    appendViewedCheckboxes();

    /** @type {HTMLInputElement} */
    const txtFilter = document.querySelector('#gdf-hide-input');
    /** @type {HTMLAnchorElement} */
    const btnHide = document.querySelector('#gdf-hide-btn');
    /** @type {HTMLButtonElement} */
    const btnShowAll = document.querySelector('#gdf-show-all-btn');
    /** @type {HTMLAnchorElement} */
    const btnClose = document.querySelector('#gdf-close-btn');

    /**
     * 
     */
    function appendStyles() {
      document.head.append(
        document.createRange().createContextualFragment(cssTemplate)
      );
    }

    /**
     * 
     */
    function appendFilterForm() {
      document.querySelector('.toc-diff-stats').append(
        document.createRange().createContextualFragment(formTemplate)
      );
      gdf = document.querySelector("#gdf");
    }

    /**
     * 
     */
    function addFormListeners() {
      btnHide.addEventListener('click', applyFilter);
      txtFilter.addEventListener('keyup', filterOnEnter);
      btnShowAll.addEventListener('click', showAll);
      btnClose.addEventListener('click', function () {
        gdf.hidden = true;
      });
    }

    /**
     * 
     */
    function appendViewedCheckboxes() {
      document.querySelectorAll('.file-info').forEach(el => {
        el.after(
          document.createRange().createContextualFragment(viewedTemplate)
        );
      });
      document.querySelector('.js-diff-progressive-container').addEventListener('change', (event) => {
        if (event.target.classList.contains('js-reviewed-checkbox')) {
          event.target.parentElement.previousSibling.querySelector("button")?.click();
        }
      });
    }

    // Create the function that hides files.
    /**
     * 
     * @param {KeyboardEvent} event 
     */
    function filterOnEnter(event) {
      if (event.key === 'Enter') {
        applyFilter();
      }
    }

    /**
     * 
     */
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
      const replacementPattern = toRegex(path);
      hideTableOfContentsEntry(replacementPattern);
      hideDiffEntry(replacementPattern);
      updateCounts();
    }

    /**
     * 
     * @param {string} pattern 
     */
    function hideTableOfContentsEntry(pattern) {
      [...document.querySelectorAll('#toc a[href^="#diff"]')]
        .filter(el => el.textContent.match(pattern))
        .map(el => el.closest('li'))
        .forEach(hide)
    }

    /**
     * 
     * @param {string} pattern 
     */
    function hideDiffEntry(pattern) {
      [...document.querySelectorAll(`[data-tagsearch-path]`)]
        .filter(el => el.attributes['data-tagsearch-path']?.value.match(pattern))
        .forEach(hide)
    }

    function updateCounts() {
      const fileCount = document.querySelectorAll(`[data-tagsearch-path]:not([hidden])`).length;
      const statsButton = document.querySelector('.toc-diff-stats>button');
      statsButton.textContent = `${fileCount} changed files`
    }

    /**
     * 
     * @param {string} wildcardPattern 
     * @returns 
     */
    function toRegex(wildcardPattern) {
      const regexPattern = wildcardPattern
        // Replace everything but wildcards (*)
        .replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&')
        .replace(/\*/g, ".*")
        .replace(/\*/g, ".*")
      return `^${regexPattern}$`;
    }

    /**
     * 
     * @param {HTMLElement} el 
     */
    function hide(el) {
      if (!hiddenElements.has(el)) {
        el.hidden = true;
        hiddenElements.add(el);
      }
    }

    /**
     * 
     */
    function showAll() {
      hiddenElements.forEach(el => el.hidden = false)
      hiddenElements.clear();
      btnShowAll.disabled = true;
    };
  }
  gdf.hidden = true;
})();
