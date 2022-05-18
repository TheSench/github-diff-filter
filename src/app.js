(function () {
  /** @type {Set<HTMLElement>} */
  const hiddenElements = new Set();

  // Includes processed by grunt-include-replace.
  var cssTemplate = '<style>@@include("style.min.css")</style>';
  var formTemplate = '@@include("../temp/html/form.html")';
  var viewedTemplate = '@@include("../temp/html/viewed.html")';
  var pathTemplate = '@@include("../temp/html/path.html")';

  // If not already done, attach the CSS to the head and the overlay markup to the body.
  /** @type {HTMLDivElement} */
  let gdf = document.querySelector('#gdf');
  if (!gdf) {
    /** @type {HTMLInputElement} */
    let txtFilter;
    /** @type {HTMLButtonElement} */
    let btnShowAll;
  
    appendStyles();
    appendFilterForm();
    appendViewedCheckboxes();
    appendPathFilters();

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
      document.querySelector('#gdf-hide-btn').addEventListener('click', applyFilter);
      document.querySelector('#gdf-close-btn').addEventListener('click', function () {
        gdf.hidden = true;
      });

      txtFilter = document.querySelector('#gdf-hide-input');
      txtFilter.addEventListener('keyup', filterOnEnter);
      
      btnShowAll = document.querySelector('#gdf-show-all-btn');
      btnShowAll.addEventListener('click', showAll);
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

    /**
     * 
     */
    function appendPathFilters() {
      const list = document.createElement('ul');
      getRootPaths().forEach(path => {
        list.append(
          document.createRange().createContextualFragment(pathTemplate.replaceAll('{{Path}}', path))
        );
      });
      document.querySelector('#toc').after(list);
      list.addEventListener("click", event => {
        if (event.target.nodeName === 'LABELS') {
          event.target.querySelector('input').click();
        }
      });
      list.addEventListener('change', (event) => {
        const path = event.target.value;
        if (event.target.checked) {
          unfilterPath(path);
        } else {
          filterPath(path);
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
     * @param {string} path 
     */
    function unfilterPath(path) {
      const replacementPattern = toRegex(path);
      showTableOfContentsEntry(replacementPattern);
      showDiffEntry(replacementPattern);
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
    function showTableOfContentsEntry(pattern) {
      [...document.querySelectorAll('#toc a[href^="#diff"]')]
        .filter(el => el.textContent.match(pattern))
        .map(el => el.closest('li'))
        .forEach(show)
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
     * @param {string} pattern 
     */
    function showDiffEntry(pattern) {
      [...document.querySelectorAll(`[data-tagsearch-path]`)]
        .filter(el => el.attributes['data-tagsearch-path']?.value.match(pattern))
        .forEach(show)
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
     * @returns 
     */
    function getRootPaths() {
      return [...new Set(
        [...document.querySelectorAll('[data-tagsearch-path]')]
          .map(el => el.attributes['data-tagsearch-path'].value)
          .map(path => path.split('/')[0])
      )]
        .map(path => path + "/*");
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
     * @param {HTMLElement} el 
     */
    function show(el) {
      if (hiddenElements.has(el)) {
        el.hidden = false;
        hiddenElements.delete(el);
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
