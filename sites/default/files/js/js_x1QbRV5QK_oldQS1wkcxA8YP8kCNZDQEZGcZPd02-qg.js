/**
 * @file
 * Form features.
 */

/**
 * Triggers when a value in the form changed.
 *
 * The event triggers when content is typed or pasted in a text field, before
 * the change event triggers.
 *
 * @event formUpdated
 */

/**
 * Triggers when a click on a page fragment link or hash change is detected.
 *
 * The event triggers when the fragment in the URL changes (a hash change) and
 * when a link containing a fragment identifier is clicked. In case the hash
 * changes due to a click this event will only be triggered once.
 *
 * @event formFragmentLinkClickOrHashChange
 */

(function ($, Drupal, debounce) {
  /**
   * Retrieves the summary for the first element.
   *
   * @return {string}
   *   The text of the summary.
   */
  $.fn.drupalGetSummary = function () {
    const callback = this.data('summaryCallback');
    return this[0] && callback ? callback(this[0]).trim() : '';
  };

  /**
   * Sets the summary for all matched elements.
   *
   * @param {function} callback
   *   Either a function that will be called each time the summary is
   *   retrieved or a string (which is returned each time).
   *
   * @return {jQuery}
   *   jQuery collection of the current element.
   *
   * @fires event:summaryUpdated
   *
   * @listens event:formUpdated
   */
  $.fn.drupalSetSummary = function (callback) {
    const self = this;

    // To facilitate things, the callback should always be a function. If it's
    // not, we wrap it into an anonymous function which just returns the value.
    if (typeof callback !== 'function') {
      const val = callback;
      callback = function () {
        return val;
      };
    }

    return (
      this.data('summaryCallback', callback)
        // To prevent duplicate events, the handlers are first removed and then
        // (re-)added.
        .off('formUpdated.summary')
        .on('formUpdated.summary', () => {
          self.trigger('summaryUpdated');
        })
        // The actual summaryUpdated handler doesn't fire when the callback is
        // changed, so we have to do this manually.
        .trigger('summaryUpdated')
    );
  };

  /**
   * Prevents consecutive form submissions of identical form values.
   *
   * Repetitive form submissions that would submit the identical form values
   * are prevented, unless the form values are different to the previously
   * submitted values.
   *
   * This is a simplified re-implementation of a user-agent behavior that
   * should be natively supported by major web browsers, but at this time, only
   * Firefox has a built-in protection.
   *
   * A form value-based approach ensures that the constraint is triggered for
   * consecutive, identical form submissions only. Compared to that, a form
   * button-based approach would (1) rely on [visible] buttons to exist where
   * technically not required and (2) require more complex state management if
   * there are multiple buttons in a form.
   *
   * This implementation is based on form-level submit events only and relies
   * on jQuery's serialize() method to determine submitted form values. As such,
   * the following limitations exist:
   *
   * - Event handlers on form buttons that preventDefault() do not receive a
   *   double-submit protection. That is deemed to be fine, since such button
   *   events typically trigger reversible client-side or server-side
   *   operations that are local to the context of a form only.
   * - Changed values in advanced form controls, such as file inputs, are not
   *   part of the form values being compared between consecutive form submits
   *   (due to limitations of jQuery.serialize()). That is deemed to be
   *   acceptable, because if the user forgot to attach a file, then the size of
   *   HTTP payload will most likely be small enough to be fully passed to the
   *   server endpoint within (milli)seconds. If a user mistakenly attached a
   *   wrong file and is technically versed enough to cancel the form submission
   *   (and HTTP payload) in order to attach a different file, then that
   *   edge-case is not supported here.
   *
   * Lastly, all forms submitted via HTTP GET are idempotent by definition of
   * HTTP standards, so excluded in this implementation.
   *
   * @type {Drupal~behavior}
   */
  Drupal.behaviors.formSingleSubmit = {
    attach() {
      function onFormSubmit(e) {
        const $form = $(e.currentTarget);
        const formValues = $form.serialize();
        const previousValues = $form.attr('data-drupal-form-submit-last');
        if (previousValues === formValues) {
          e.preventDefault();
        } else {
          $form.attr('data-drupal-form-submit-last', formValues);
        }
      }

      $(once('form-single-submit', 'body')).on(
        'submit.singleSubmit',
        'form:not([method~="GET"])',
        onFormSubmit,
      );
    },
  };

  /**
   * Sends a 'formUpdated' event each time a form element is modified.
   *
   * @param {HTMLElement} element
   *   The element to trigger a form updated event on.
   *
   * @fires event:formUpdated
   */
  function triggerFormUpdated(element) {
    $(element).trigger('formUpdated');
  }

  /**
   * Collects the IDs of all form fields in the given form.
   *
   * @param {HTMLFormElement} form
   *   The form element to search.
   *
   * @return {Array}
   *   Array of IDs for form fields.
   */
  function fieldsList(form) {
    // We use id to avoid name duplicates on radio fields and filter out
    // elements with a name but no id.
    return [].map.call(form.querySelectorAll('[name][id]'), (el) => el.id);
  }

  /**
   * Triggers the 'formUpdated' event on form elements when they are modified.
   *
   * @type {Drupal~behavior}
   *
   * @prop {Drupal~behaviorAttach} attach
   *   Attaches formUpdated behaviors.
   * @prop {Drupal~behaviorDetach} detach
   *   Detaches formUpdated behaviors.
   *
   * @fires event:formUpdated
   */
  Drupal.behaviors.formUpdated = {
    attach(context) {
      const $context = $(context);
      const contextIsForm = $context.is('form');
      const $forms = $(
        once('form-updated', contextIsForm ? $context : $context.find('form')),
      );
      let formFields;

      if ($forms.length) {
        // Initialize form behaviors, use $.makeArray to be able to use native
        // forEach array method and have the callback parameters in the right
        // order.
        $.makeArray($forms).forEach((form) => {
          const events = 'change.formUpdated input.formUpdated ';
          const eventHandler = debounce((event) => {
            triggerFormUpdated(event.target);
          }, 300);
          formFields = fieldsList(form).join(',');

          form.setAttribute('data-drupal-form-fields', formFields);
          $(form).on(events, eventHandler);
        });
      }
      // On ajax requests context is the form element.
      if (contextIsForm) {
        formFields = fieldsList(context).join(',');
        // @todo replace with form.getAttribute() when #1979468 is in.
        const currentFields = $(context).attr('data-drupal-form-fields');
        // If there has been a change in the fields or their order, trigger
        // formUpdated.
        if (formFields !== currentFields) {
          triggerFormUpdated(context);
        }
      }
    },
    detach(context, settings, trigger) {
      const $context = $(context);
      const contextIsForm = $context.is('form');
      if (trigger === 'unload') {
        once
          .remove(
            'form-updated',
            contextIsForm ? $context : $context.find('form'),
          )
          .forEach((form) => {
            form.removeAttribute('data-drupal-form-fields');
            $(form).off('.formUpdated');
          });
      }
    },
  };

  /**
   * Prepopulate form fields with information from the visitor browser.
   *
   * @type {Drupal~behavior}
   *
   * @prop {Drupal~behaviorAttach} attach
   *   Attaches the behavior for filling user info from browser.
   */
  Drupal.behaviors.fillUserInfoFromBrowser = {
    attach(context, settings) {
      const userInfo = ['name', 'mail', 'homepage'];
      const $forms = $(
        once('user-info-from-browser', '[data-user-info-from-browser]'),
      );
      if ($forms.length) {
        userInfo.forEach((info) => {
          const $element = $forms.find(`[name=${info}]`);
          const browserData = localStorage.getItem(`Drupal.visitor.${info}`);
          if (!$element.length) {
            return;
          }
          const emptyValue = $element[0].value === '';
          const defaultValue =
            $element.attr('data-drupal-default-value') === $element[0].value;
          if (browserData && (emptyValue || defaultValue)) {
            $element.each(function (index, item) {
              item.value = browserData;
            });
          }
        });
      }
      $forms.on('submit', () => {
        userInfo.forEach((info) => {
          const $element = $forms.find(`[name=${info}]`);
          if ($element.length) {
            localStorage.setItem(`Drupal.visitor.${info}`, $element[0].value);
          }
        });
      });
    },
  };

  /**
   * Sends a fragment interaction event on a hash change or fragment link click.
   *
   * @param {jQuery.Event} e
   *   The event triggered.
   *
   * @fires event:formFragmentLinkClickOrHashChange
   */
  const handleFragmentLinkClickOrHashChange = (e) => {
    let url;
    if (e.type === 'click') {
      url = e.currentTarget.location
        ? e.currentTarget.location
        : e.currentTarget;
    } else {
      url = window.location;
    }
    const hash = url.hash.substr(1);
    if (hash) {
      const $target = $(`#${hash}`);
      $('body').trigger('formFragmentLinkClickOrHashChange', [$target]);

      /**
       * Clicking a fragment link or a hash change should focus the target
       * element, but event timing issues in multiple browsers require a timeout.
       */
      setTimeout(() => $target.trigger('focus'), 300);
    }
  };

  const debouncedHandleFragmentLinkClickOrHashChange = debounce(
    handleFragmentLinkClickOrHashChange,
    300,
    true,
  );

  // Binds a listener to handle URL fragment changes.
  $(window).on(
    'hashchange.form-fragment',
    debouncedHandleFragmentLinkClickOrHashChange,
  );

  /**
   * Binds a listener to handle clicks on fragment links and absolute URL links
   * containing a fragment, this is needed next to the hash change listener
   * because clicking such links doesn't trigger a hash change when the fragment
   * is already in the URL.
   */
  $(document).on(
    'click.form-fragment',
    'a[href*="#"]',
    debouncedHandleFragmentLinkClickOrHashChange,
  );
})(jQuery, Drupal, Drupal.debounce);
;
/**
 * @file
 * Provides Text Editor UI improvements specific to CKEditor 5.
 */
((Drupal, once) => {
  Drupal.behaviors.allowedTagsListener = {
    attach: function attach(context) {
      once(
        'ajax-conflict-prevention',
        '[data-drupal-selector="filter-format-edit-form"], [data-drupal-selector="filter-format-add-form"]',
        context,
      ).forEach((form) => {
        // When the form is submitted, remove the disabled attribute from all
        // AJAX enabled form elements. The disabled state is added as part of
        // AJAX processing, but will prevent the value from being added to
        // $form_state.
        form.addEventListener('submit', () => {
          once
            .filter(
              'drupal-ajax',
              '[data-drupal-selector="filter-format-edit-form"] [disabled], [data-drupal-selector="filter-format-add-form"] [disabled]',
            )
            // eslint-disable-next-line max-nested-callbacks
            .forEach((disabledElement) => {
              disabledElement.removeAttribute('disabled');
            });
        });
      });
    },
  };

  // Copy the function that is about to be overridden so it can be invoked
  // inside the override.
  const originalAjaxEventResponse = Drupal.Ajax.prototype.eventResponse;

  /**
   * Overrides Ajax.eventResponse with CKEditor 5 specific customizations.
   *
   * This is the handler for events that will ultimately trigger an AJAX
   * response. It is overridden here to provide additional logic to prevent
   * specific CKEditor 5-related events from triggering that AJAX response
   * unless certain criteria are met.
   */
  Drupal.Ajax.prototype.eventResponse = function ckeditor5AjaxEventResponse(
    ...args
  ) {
    // There are AJAX callbacks that should only be triggered if the editor
    // <select> is set to 'ckeditor5'. They should be active when the text
    // format is using CKEditor 5 and when a user is attempting to switch to
    // CKEditor 5 but is prevented from doing so by validation. Triggering these
    // AJAX callback when trying to switch to CKEditor 5 but blocked by
    // validation benefits the user as they get real time feedback as they
    // configure the text format to be CKEditor 5 compatible. This spares them
    // from having to submit the form multiple times in order to determine if
    // their settings are compatible.
    // This validation stage is also why the AJAX callbacks can't be
    // conditionally added server side, as validation errors interrupt the form
    // rebuild before the AJAX callbacks could be added via form_alter.
    if (this.ckeditor5_only) {
      // The ckeditor5_only property is added to form elements that should only
      // trigger AJAX callbacks when the editor <select> value is 'ckeditor5'.
      // These callbacks provide real-time validation that should be present for
      // both text formats using CKEditor 5 and text formats in the process of
      // switching to CKEditor 5, but prevented from doing so by validation.
      if (
        this.$form[0].querySelector('#edit-editor-editor').value !== 'ckeditor5'
      ) {
        return;
      }
    }

    originalAjaxEventResponse.apply(this, args);
  };
})(Drupal, once);
;
/**
 * @file
 * Attaches administration-specific behavior for the Filter module.
 */

(function ($, Drupal) {
  /**
   * Displays and updates the status of filters on the admin page.
   *
   * @type {Drupal~behavior}
   *
   * @prop {Drupal~behaviorAttach} attach
   *   Attaches behaviors to the filter admin view.
   */
  Drupal.behaviors.filterStatus = {
    attach(context, settings) {
      const $context = $(context);
      once(
        'filter-status',
        '#filters-status-wrapper input.form-checkbox',
        context,
      ).forEach((checkbox) => {
        const $checkbox = $(checkbox);
        // Retrieve the tabledrag row belonging to this filter.
        const $row = $context
          .find(`#${$checkbox.attr('id').replace(/-status$/, '-weight')}`)
          .closest('tr');
        // Retrieve the vertical tab belonging to this filter.
        const $filterSettings = $context.find(
          `[data-drupal-selector='${$checkbox
            .attr('id')
            .replace(/-status$/, '-settings')}']`,
        );
        const filterSettingsTab = $filterSettings.data('verticalTab');

        // Bind click handler to this checkbox to conditionally show and hide
        // the filter's tableDrag row and vertical tab pane.
        $checkbox.on('click.filterUpdate', () => {
          if ($checkbox.is(':checked')) {
            $row.show();
            if (filterSettingsTab) {
              filterSettingsTab.tabShow().updateSummary();
            } else {
              // On very narrow viewports, Vertical Tabs are disabled.
              $filterSettings.show();
            }
          } else {
            $row.hide();
            if (filterSettingsTab) {
              filterSettingsTab.tabHide().updateSummary();
            } else {
              // On very narrow viewports, Vertical Tabs are disabled.
              $filterSettings.hide();
            }
          }
          // Restripe table after toggling visibility of table row.
          Drupal.tableDrag['filter-order'].restripeTable();
        });

        // Attach summary for configurable filters (only for screen readers).
        if (filterSettingsTab) {
          filterSettingsTab.details.drupalSetSummary(() =>
            $checkbox.is(':checked')
              ? Drupal.t('Enabled')
              : Drupal.t('Disabled'),
          );
        }

        // Trigger our bound click handler to update elements to initial state.
        $checkbox.triggerHandler('click.filterUpdate');
      });
    },
  };
})(jQuery, Drupal);
;
/**
 * @file
 * Overrides vertical tabs theming to enable Claro designs.
 */

(($, Drupal) => {
  /**
   * Theme function for a vertical tab.
   *
   * @param {object} settings
   *   An object with the following keys:
   * @param {string} settings.title
   *   The name of the tab.
   *
   * @return {object}
   *   This function has to return an object with at least these keys:
   *   - item: The root tab jQuery element
   *   - link: The anchor tag that acts as the clickable area of the tab
   *       (jQuery version)
   *   - summary: The jQuery element that contains the tab summary
   */
  Drupal.theme.verticalTab = (settings) => {
    const tab = {};
    tab.title = $('<strong class="vertical-tabs__menu-item-title"></strong>');
    tab.title[0].textContent = settings.title;
    tab.item = $(
      '<li class="vertical-tabs__menu-item" tabindex="-1"></li>',
    ).append(
      (tab.link = $('<a href="#" class="vertical-tabs__menu-link"></a>').append(
        $('<span class="vertical-tabs__menu-link-content"></span>')
          .append(tab.title)
          .append(
            (tab.summary = $(
              '<span class="vertical-tabs__menu-link-summary"></span>',
            )),
          ),
      )),
    );
    return tab;
  };
})(jQuery, Drupal);
;
/**
 * @file
 * Adds a summary of a details element's contents to its summary element.
 */
(($, Drupal) => {
  /**
   * The DetailsSummarizedContent object represents a single details element.
   *
   * @constructor Drupal.DetailsSummarizedContent
   *
   * @param {HTMLElement} node
   *   A details element, the summary of which may have supplemental text.
   *   The supplemental text summarizes the details element's contents.
   */
  function DetailsSummarizedContent(node) {
    this.$node = $(node);
    this.setupSummary();
  }

  $.extend(
    DetailsSummarizedContent,
    /** @lends Drupal.DetailsSummarizedContent */ {
      /**
       * Holds references to instantiated DetailsSummarizedContent objects.
       *
       * @type {Array.<Drupal.DetailsSummarizedContent>}
       */
      instances: [],
    },
  );

  $.extend(
    DetailsSummarizedContent.prototype,
    /** @lends Drupal.DetailsSummarizedContent# */ {
      /**
       * Initialize and setup summary events and markup.
       *
       * @fires event:summaryUpdated
       *
       * @listens event:summaryUpdated
       */
      setupSummary() {
        this.$detailsSummarizedContentWrapper = $(
          Drupal.theme('detailsSummarizedContentWrapper'),
        );
        this.$node
          .on('summaryUpdated', $.proxy(this.onSummaryUpdated, this))
          .trigger('summaryUpdated')
          .find('> summary')
          .append(this.$detailsSummarizedContentWrapper);
      },

      /**
       * Update summary.
       */
      onSummaryUpdated() {
        const text = this.$node.drupalGetSummary();
        this.$detailsSummarizedContentWrapper.html(
          Drupal.theme('detailsSummarizedContentText', text),
        );
      },
    },
  );

  /**
   * Adds a summary of a details element's contents to its summary element.
   *
   * @type {Drupal~behavior}
   *
   * @prop {Drupal~behaviorAttach} attach
   *   Attaches behavior for the details element.
   */
  Drupal.behaviors.detailsSummary = {
    attach(context) {
      DetailsSummarizedContent.instances =
        DetailsSummarizedContent.instances.concat(
          once('details', 'details', context).map(
            (details) => new DetailsSummarizedContent(details),
          ),
        );
    },
  };

  Drupal.DetailsSummarizedContent = DetailsSummarizedContent;

  /**
   * The element containing a wrapper for summarized details content.
   *
   * @return {string}
   *   The markup for the element that will contain the summarized content.
   */
  Drupal.theme.detailsSummarizedContentWrapper = () =>
    `<span class="summary"></span>`;

  /**
   * Formats the summarized details content text.
   *
   * @param {string|null} [text]
   *   (optional) The summarized content text displayed in the summary.
   * @return {string}
   *   The formatted summarized content text.
   */
  Drupal.theme.detailsSummarizedContentText = (text) =>
    text ? ` (${text})` : '';
})(jQuery, Drupal);
;
/**
 * @file
 * Add aria attribute handling for details and summary elements.
 */

(function ($, Drupal) {
  /**
   * Handles `aria-expanded` and `aria-pressed` attributes on details elements.
   *
   * @type {Drupal~behavior}
   */
  Drupal.behaviors.detailsAria = {
    attach() {
      $(once('detailsAria', 'body')).on(
        'click.detailsAria',
        'summary',
        (event) => {
          const $summary = $(event.currentTarget);
          const open =
            $(event.currentTarget.parentNode).attr('open') === 'open'
              ? 'false'
              : 'true';

          $summary.attr({
            'aria-expanded': open,
            'aria-pressed': open,
          });
        },
      );
    },
  };
})(jQuery, Drupal);
;
/**
 * @file
 * Additional functionality for HTML5 details elements.
 */

(function ($) {
  /**
   * Open parent details elements of a targeted page fragment.
   *
   * Opens all (nested) details element on a hash change or fragment link click
   * when the target is a child element, in order to make sure the targeted
   * element is visible. Aria attributes on the summary
   * are set by triggering the click event listener in details-aria.js.
   *
   * @param {jQuery.Event} e
   *   The event triggered.
   * @param {jQuery} $target
   *   The targeted node as a jQuery object.
   */
  const handleFragmentLinkClickOrHashChange = (e, $target) => {
    $target.parents('details').not('[open]').find('> summary').trigger('click');
  };

  /**
   * Binds a listener to handle fragment link clicks and URL hash changes.
   */
  $('body').on(
    'formFragmentLinkClickOrHashChange.details',
    handleFragmentLinkClickOrHashChange,
  );
})(jQuery);
;
/**
 * @file
 * Claro's polyfill enhancements for HTML5 details.
 */

(($, Drupal) => {
  /**
   * Workaround for Firefox.
   *
   * Firefox applies the focus state only for keyboard navigation.
   * We have to manually trigger focus to make the behavior consistent across
   * browsers.
   *
   * @type {Drupal~behavior}
   */
  Drupal.behaviors.claroDetails = {
    attach(context) {
      // The second argument of once() needs to be an instance of Element, but
      // document is an instance of Document, replace it with the html Element.
      $(once('claroDetails', context === document ? 'html' : context)).on(
        'click',
        (event) => {
          if (event.target.nodeName === 'SUMMARY') {
            $(event.target).trigger('focus');
          }
        },
      );
    },
  };

  /**
   * Theme override providing a wrapper for summarized details content.
   *
   * @return {string}
   *   The markup for the element that will contain the summarized content.
   */
  Drupal.theme.detailsSummarizedContentWrapper = () =>
    `<span class="claro-details__summary-summary"></span>`;

  /**
   * Theme override of summarized details content text.
   *
   * @param {string|null} [text]
   *   (optional) The summarized content displayed in the summary.
   * @return {string}
   *   The formatted summarized content text.
   */
  Drupal.theme.detailsSummarizedContentText = (text) => text || '';
})(jQuery, Drupal);
;
/**
 * @file
 * Attaches behavior for updating filter_html's settings automatically.
 */

(function ($, Drupal, document) {
  if (Drupal.filterConfiguration) {
    /**
     * Implement a live setting parser to prevent text editors from
     * automatically enabling buttons that are not allowed by this filter's
     * configuration.
     *
     * @namespace
     */
    Drupal.filterConfiguration.liveSettingParsers.filter_html = {
      /**
       * @return {Array}
       *   An array of filter rules.
       */
      getRules() {
        const currentValue = document.querySelector(
          '#edit-filters-filter-html-settings-allowed-html',
        ).value;
        const rules =
          Drupal.behaviors.filterFilterHtmlUpdating._parseSetting(currentValue);

        // Build a FilterHTMLRule that reflects the hard-coded behavior that
        // strips all "style" attribute and all "on*" attributes.
        const rule = new Drupal.FilterHTMLRule();
        rule.restrictedTags.tags = ['*'];
        rule.restrictedTags.forbidden.attributes = ['style', 'on*'];
        rules.push(rule);

        return rules;
      },
    };
  }

  /**
   * Gets the values that are present in one array but not another.
   *
   * @param {Array[]} args
   *   The list of arrays to process.
   *
   * @return {Array}
   *   Returns the first array without the values present in other arrays.
   */
  function difference(...args) {
    return args.reduce((mainData, otherData) =>
      mainData.filter((data) => !otherData.includes(data)),
    );
  }

  /**
   * Displays and updates what HTML tags are allowed to use in a filter.
   *
   * @type {Drupal~behavior}
   *
   * @todo Remove everything but 'attach' and 'detach' and make a proper object.
   *
   * @prop {Drupal~behaviorAttach} attach
   *   Attaches behavior for updating allowed HTML tags.
   */
  Drupal.behaviors.filterFilterHtmlUpdating = {
    // The form item contains the "Allowed HTML tags" setting.
    $allowedHTMLFormItem: null,

    // The description for the "Allowed HTML tags" field.
    $allowedHTMLDescription: null,

    /**
     * The parsed, user-entered tag list of $allowedHTMLFormItem
     *
     * @var {Object.<string, Drupal.FilterHTMLRule>}
     */
    userTags: {},

    // The auto-created tag list thus far added.
    autoTags: null,

    // Track which new features have been added to the text editor.
    newFeatures: {},

    attach(context, settings) {
      const that = this;
      once(
        'filter-filter_html-updating',
        '[name="filters[filter_html][settings][allowed_html]"]',
        context,
      ).forEach((formItem) => {
        that.$allowedHTMLFormItem = $(formItem);
        that.$allowedHTMLDescription = that.$allowedHTMLFormItem
          .closest('.js-form-item')
          .find('#edit-filters-filter-html-settings-allowed-html--description');
        that.userTags = that._parseSetting(formItem.value);

        // Update the new allowed tags based on added text editor features.
        $(document)
          .on('drupalEditorFeatureAdded', (e, feature) => {
            that.newFeatures[feature.name] = feature.rules;
            that._updateAllowedTags();
          })
          .on('drupalEditorFeatureModified', (e, feature) => {
            if (that.newFeatures.hasOwnProperty(feature.name)) {
              that.newFeatures[feature.name] = feature.rules;
              that._updateAllowedTags();
            }
          })
          .on('drupalEditorFeatureRemoved', (e, feature) => {
            if (that.newFeatures.hasOwnProperty(feature.name)) {
              delete that.newFeatures[feature.name];
              that._updateAllowedTags();
            }
          });

        // When the allowed tags list is manually changed, update userTags.
        that.$allowedHTMLFormItem.on('change.updateUserTags', function () {
          that.userTags = difference(
            Object.values(that._parseSetting(this.value)),
            Object.values(that.autoTags),
          );
        });
      });
    },

    /**
     * Updates the "Allowed HTML tags" setting and shows an informative message.
     */
    _updateAllowedTags() {
      // Update the list of auto-created tags.
      this.autoTags = this._calculateAutoAllowedTags(
        this.userTags,
        this.newFeatures,
      );

      // Remove any previous auto-created tag message.
      this.$allowedHTMLDescription.find('.editor-update-message').remove();

      // If any auto-created tags: insert message and update form item.
      if (Object.keys(this.autoTags).length > 0) {
        this.$allowedHTMLDescription.append(
          Drupal.theme('filterFilterHTMLUpdateMessage', this.autoTags),
        );

        const userTagsWithoutOverrides = {};
        Object.keys(this.userTags)
          .filter((tag) => !this.autoTags.hasOwnProperty(tag))
          .forEach((tag) => {
            userTagsWithoutOverrides[tag] = this.userTags[tag];
          });

        this.$allowedHTMLFormItem.val(
          `${this._generateSetting(
            userTagsWithoutOverrides,
          )} ${this._generateSetting(this.autoTags)}`,
        );
      }
      // Restore to original state.
      else {
        this.$allowedHTMLFormItem.val(this._generateSetting(this.userTags));
      }
    },

    /**
     * Calculates which HTML tags the added text editor buttons need to work.
     *
     * The filter_html filter is only concerned with the required tags, not with
     * any properties, nor with each feature's "allowed" tags.
     *
     * @param {Array} userAllowedTags
     *   The list of user-defined allowed tags.
     * @param {object} newFeatures
     *   A list of {@link Drupal.EditorFeature} objects' rules, keyed by
     *   their name.
     *
     * @return {Array}
     *   A list of new allowed tags.
     */
    _calculateAutoAllowedTags(userAllowedTags, newFeatures) {
      const editorRequiredTags = {};

      // Map the newly added Text Editor features to Drupal.FilterHtmlRule
      // objects (to allow comparing userTags with autoTags).
      Object.keys(newFeatures || {}).forEach((featureName) => {
        const feature = newFeatures[featureName];
        let featureRule;
        let filterRule;
        let tag;

        for (let f = 0; f < feature.length; f++) {
          featureRule = feature[f];
          for (let t = 0; t < featureRule.required.tags.length; t++) {
            tag = featureRule.required.tags[t];
            if (!editorRequiredTags.hasOwnProperty(tag)) {
              filterRule = new Drupal.FilterHTMLRule();
              filterRule.restrictedTags.tags = [tag];
              // @todo Neither Drupal.FilterHtmlRule nor
              //   Drupal.EditorFeatureHTMLRule allow for generic attribute
              //   value restrictions, only for the "class" and "style"
              //   attribute's values to be restricted. The filter_html filter
              //   always disallows the "style" attribute, so we only need to
              //   support "class" attribute value restrictions. Fix once
              //   https://www.drupal.org/node/2567801 lands.
              filterRule.restrictedTags.allowed.attributes =
                featureRule.required.attributes.slice(0);
              if (
                userAllowedTags[tag] !== undefined &&
                userAllowedTags[tag].restrictedTags.allowed.classes[0] !== ''
              ) {
                filterRule.restrictedTags.allowed.classes =
                  featureRule.required.classes.slice(0);
              }
              editorRequiredTags[tag] = filterRule;
            }
            // The tag is already allowed, add any additionally allowed
            // attributes.
            else {
              filterRule = editorRequiredTags[tag];
              filterRule.restrictedTags.allowed.attributes = [
                ...filterRule.restrictedTags.allowed.attributes,
                ...featureRule.required.attributes,
              ];
              if (
                userAllowedTags[tag] !== undefined &&
                userAllowedTags[tag].restrictedTags.allowed.classes[0] !== ''
              ) {
                filterRule.restrictedTags.allowed.classes = [
                  ...filterRule.restrictedTags.allowed.classes,
                  ...featureRule.required.classes,
                ];
              }
            }
          }
        }
      });

      // Now compare userAllowedTags with editorRequiredTags, and build
      // autoAllowedTags, which contains:
      // - any tags in editorRequiredTags but not in userAllowedTags (i.e. tags
      //   that are additionally going to be allowed)
      // - any tags in editorRequiredTags that already exists in userAllowedTags
      //   but does not allow all attributes or attribute values
      const autoAllowedTags = {};
      Object.keys(editorRequiredTags).forEach((tag) => {
        // If userAllowedTags does not contain a rule for this editor-required
        // tag, then add it to the list of automatically allowed tags.
        if (!userAllowedTags.hasOwnProperty(tag)) {
          autoAllowedTags[tag] = editorRequiredTags[tag];
        }
        // Otherwise, if userAllowedTags already allows this tag, then check if
        // additional attributes and classes on this tag are required by the
        // editor.
        else {
          const requiredAttributes =
            editorRequiredTags[tag].restrictedTags.allowed.attributes;
          const allowedAttributes =
            userAllowedTags[tag].restrictedTags.allowed.attributes;
          const needsAdditionalAttributes =
            requiredAttributes.length &&
            difference(requiredAttributes, allowedAttributes).length;
          const requiredClasses =
            editorRequiredTags[tag].restrictedTags.allowed.classes;
          const allowedClasses =
            userAllowedTags[tag].restrictedTags.allowed.classes;
          const needsAdditionalClasses =
            requiredClasses.length &&
            difference(requiredClasses, allowedClasses).length;
          if (needsAdditionalAttributes || needsAdditionalClasses) {
            autoAllowedTags[tag] = userAllowedTags[tag].clone();
          }
          if (needsAdditionalAttributes) {
            autoAllowedTags[tag].restrictedTags.allowed.attributes = [
              ...allowedAttributes,
              ...requiredAttributes,
            ];
          }
          if (needsAdditionalClasses) {
            autoAllowedTags[tag].restrictedTags.allowed.classes = [
              ...allowedClasses,
              ...requiredClasses,
            ];
          }
        }
      });

      return autoAllowedTags;
    },

    /**
     * Parses the value of this.$allowedHTMLFormItem.
     *
     * @param {string} setting
     *   The string representation of the setting. For example:
     *     <p class="callout"> <br> <a href hreflang>
     *
     * @return {Object.<string, Drupal.FilterHTMLRule>}
     *   The corresponding text filter HTML rule objects, one per tag, keyed by
     *   tag name.
     */
    _parseSetting(setting) {
      let tag;
      let rule;
      let attributes;
      let attribute;

      const allowedTags = setting.match(/(<[^>]+>)/g);
      const rules = {};
      for (let t = 0; t < allowedTags.length; t++) {
        // Create a jQuery object, making it possible to easily retrieve the
        // tag name of the allowed tag, regardless of what attributes are set or
        // what its required parent elements are.
        const $tagObject = $(allowedTags[t]);

        // Parse the tag name from the jQuery object.
        tag = $tagObject.prop('tagName').toLowerCase();

        // Build the Drupal.FilterHtmlRule object.
        rule = new Drupal.FilterHTMLRule();
        // We create one rule per allowed tag, so always one tag.
        rule.restrictedTags.tags = [tag];

        // Add the attribute restrictions.
        attributes = $tagObject.prop('attributes');
        for (let i = 0; i < attributes.length; i++) {
          attribute = attributes.item(i);
          const attributeName = attribute.nodeName;
          // @todo Drupal.FilterHtmlRule does not allow for generic attribute
          //   value restrictions, only for the "class" and "style" attribute's
          //   values. The filter_html filter always disallows the "style"
          //   attribute, so we only need to support "class" attribute value
          //   restrictions. Fix once https://www.drupal.org/node/2567801 lands.
          if (attributeName === 'class') {
            const attributeValue = attribute.textContent;
            rule.restrictedTags.allowed.classes = attributeValue.split(' ');
          } else {
            rule.restrictedTags.allowed.attributes.push(attributeName);
          }
        }

        rules[tag] = rule;
      }
      return rules;
    },

    /**
     * Generates the value of this.$allowedHTMLFormItem.
     *
     * @param {Object.<string, Drupal.FilterHTMLRule>} tags
     *   The parsed representation of the setting.
     *
     * @return {Array}
     *   The string representation of the setting. e.g. "<p> <br> <a>"
     */
    _generateSetting(tags) {
      return Object.keys(tags).reduce((setting, tag) => {
        const rule = tags[tag];
        const allowedClasses = rule.restrictedTags.allowed.classes;

        if (setting.length) {
          setting += ' ';
        }

        setting += `<${tag}`;
        if (rule.restrictedTags.allowed.attributes.length) {
          setting += ` ${rule.restrictedTags.allowed.attributes.join(' ')}`;
        }
        // @todo Drupal.FilterHtmlRule does not allow for generic attribute
        //   value restrictions, only for the "class" and "style" attribute's
        //   values. The filter_html filter always disallows the "style"
        //   attribute, so we only need to support "class" attribute value
        //   restrictions. Fix once https://www.drupal.org/node/2567801 lands.
        if (allowedClasses.length === 1 && allowedClasses[0] === '') {
          setting += ' class';
        } else if (allowedClasses.length) {
          setting += ' class="'.concat(allowedClasses.join(' '), '"');
        }

        setting += '>';
        return setting;
      }, '');
    },
  };

  /**
   * Theme function for the filter_html update message.
   *
   * @param {Array} tags
   *   An array of the new tags that are to be allowed.
   *
   * @return {string}
   *   The corresponding HTML.
   */
  Drupal.theme.filterFilterHTMLUpdateMessage = function (tags) {
    let html = '';
    const tagList =
      Drupal.behaviors.filterFilterHtmlUpdating._generateSetting(tags);
    html += '<p class="editor-update-message">';
    html += Drupal.t(
      'Based on the text editor configuration, these tags have automatically been added: <strong>@tag-list</strong>.',
      { '@tag-list': tagList },
    );
    html += '</p>';
    return html;
  };
})(jQuery, Drupal, document);
;
/**
 * @file
 * tabledrag.js overrides and functionality extensions.
 */

(($, Drupal) => {
  /**
   * Extends core's Tabledrag functionality.
   *
   * @type {Drupal~behavior}
   */
  Drupal.behaviors.claroTableDrag = {
    attach(context, settings) {
      /**
       * Refactors the table row markup to improve item label text wrapping.
       *
       * This addresses an issue specific to item labels that are long enough
       * to be wrapped to a new line. Without this fix, a new line may start
       * at the beginning of the table row, instead of the expected behavior of
       * starting at the x axis of the first line.
       *
       * Addressing this issue requires changing the structure of a tabledrag
       * cell's first row.
       * @example
       *   <!-- Default tabledrag structure, which has the wrapping problem. -->
       *   <tr class="draggable">
       *     <td>
       *       <!--
       *         Indentations are next to each other because they are styled as
       *         `float: left;`
       *       -->
       *       <div class="indentation"></div>
       *       <div class="indentation"></div>
       *       <a class="tabledrag-handle"></a>
       *       <!-- If the text in this link wraps enough times that the element
       *         is taller than the floated elements preceding it, some lines
       *         will wrap to the beginning of the row instead of aligning with
       *         the beginning of the link text.
       *       -->
       *       <a class="menu-item__link">A longer label that may require wrapping</a>
       *     </td>
       *     <!-- etc. -->
       *   </tr>
       * @example
       * <!-- Claro tabledrag structure, this fixes the wrapping problem. -->
       *   <tr class="draggable">
       *     <td class="tabledrag-cell">
       *       <div class="tabledrag-cell-content">
       *          <!-- Indentations are next to each other because
       *            .table-drag-cell-content is styled as `display: table-row;`
       *            and .table-drag-cell-content > * is styled as
       *            `display: table-cell;`
       *          -->
       *         <div class="indentation"></div>
       *         <div class="indentation"></div>
       *         <a class="tabledrag-handle"></a>
       *         <div class="tabledrag-cell-content__item">
       *           <!-- Placing the link inside a div styled as
       *             `display: table-cell;` allows the text to wrap within
       *             the boundaries of the "cell".
       *           -->
       *           <a class="menu-item__link">A longer label that may require wrapping</a>
       *         </div>
       *      </div>
       *    </td>
       *    <!-- additional <td> -->
       *   </tr>
       *
       * @param {number} index
       *   The index in the loop, as provided by `jQuery.each`.
       * @param {HTMLElement} row
       *   A draggable table row.
       *
       * @todo this may be removable as part of https://drupal.org/node/3083044
       */
      const createItemWrapBoundaries = (row) => {
        const $row = $(row);
        const $firstCell = $row
          .find('td:first-of-type')
          .eq(0)
          .wrapInner(Drupal.theme('tableDragCellContentWrapper'))
          .wrapInner(
            $(Drupal.theme('tableDragCellItemsWrapper')).addClass(
              'js-tabledrag-cell-content',
            ),
          );

        const $targetElem = $firstCell.find('.js-tabledrag-cell-content');

        // Move handle into the '.js-tabledrag-cell-content' target.
        $targetElem
          .eq(0)
          .find(
            '> .tabledrag-cell-content__item > .js-tabledrag-handle, > .tabledrag-cell-content__item > .js-indentation',
          )
          .prependTo($targetElem);
      };

      // Find each row in a draggable table and process it with
      // createItemWrapBoundaries().
      Object.keys(settings.tableDrag || {}).forEach((base) => {
        once(
          'claroTabledrag',
          $(context)
            .find(`#${base}`)
            .find('> tr.draggable, > tbody > tr.draggable'),
        ).forEach(createItemWrapBoundaries);
      });
    },
  };
  $.extend(Drupal.tableDrag.prototype.row.prototype, {
    /**
     * Add an asterisk or other marker to the changed row.
     *
     * @todo this may be removable as part of https://drupal.org/node/3084910
     */
    markChanged() {
      const marker = $(Drupal.theme('tableDragChangedMarker')).addClass(
        'js-tabledrag-changed-marker',
      );
      const cell = $(this.element).find('td:first-of-type');
      if (cell.find('.js-tabledrag-changed-marker').length === 0) {
        cell.find('.js-tabledrag-handle').after(marker);
      }
    },

    /**
     * Moves added indents into Claro's wrapper element.
     *
     * For indents to work properly, they must be inside the wrapper
     * created by createItemWrapBoundaries(). When an indent is added via
     * dragging, core's tabledrag functionality does not add it inside the
     * wrapper. This function fires immediately after an indent is added, which
     * moves the indent into that wrapper.
     *
     * @see Drupal.tableDrag.prototype.row.prototype.indent
     *
     * @todo this may be removable as part of https://drupal.org/node/3083044
     */
    onIndent() {
      $(this.table)
        .find('.tabledrag-cell > .js-indentation')
        .each((index, indentToMove) => {
          const $indentToMove = $(indentToMove);
          const $cellContent = $indentToMove.siblings(
            '.tabledrag-cell-content',
          );
          $indentToMove.prependTo($cellContent);
        });
    },
  });

  $.extend(
    Drupal.theme,
    /** @lends Drupal.theme */ {
      /**
       * Constructs the table drag changed marker.
       *
       * @return {string}
       *   Markup for the indentation.
       */
      tableDragIndentation() {
        return '<div class="js-indentation indentation"><svg xmlns="http://www.w3.org/2000/svg" class="tree" width="25" height="25" viewBox="0 0 25 25"><path class="tree__item tree__item-child-ltr tree__item-child-last-ltr tree__item-horizontal tree__item-horizontal-right" d="M12,12.5 H25" stroke="#888"/><path class="tree__item tree__item-child-rtl tree__item-child-last-rtl tree__item-horizontal tree__horizontal-left" d="M0,12.5 H13" stroke="#888"/><path class="tree__item tree__item-child-ltr tree__item-child-rtl tree__item-child-last-ltr tree__item-child-last-rtl tree__vertical tree__vertical-top" d="M12.5,12 v-99" stroke="#888"/><path class="tree__item tree__item-child-ltr tree__item-child-rtl tree__vertical tree__vertical-bottom" d="M12.5,12 v99" stroke="#888"/></svg></div>';
      },

      /**
       * Constructs the table drag changed warning.
       *
       * @return {string}
       *   Markup for the warning.
       */
      tableDragChangedWarning() {
        return `<div class="tabledrag-changed-warning messages messages--warning" role="alert">${Drupal.theme(
          'tableDragChangedMarker',
        )} ${Drupal.t('You have unsaved changes.')}</div>`;
      },

      /**
       * Constructs the table drag handle.
       *
       * @return {string}
       *   A string representing a DOM fragment.
       */
      tableDragHandle: () =>
        `<a href="#" title="${Drupal.t(
          'Drag to re-order',
        )}" class="tabledrag-handle js-tabledrag-handle"></a>`,

      /**
       * The button for toggling table row weight visibility.
       *
       * @return {string}
       *   HTML markup for the weight toggle button and its container.
       */
      tableDragToggle: () =>
        `<div class="tabledrag-toggle-weight-wrapper" data-drupal-selector="tabledrag-toggle-weight-wrapper">
            <button type="button" class="link action-link tabledrag-toggle-weight" data-drupal-selector="tabledrag-toggle-weight"></button>
            </div>`,

      /**
       * Constructs contents of the toggle weight button.
       *
       * @param {boolean} show
       *   If the table weights are currently displayed.
       *
       * @return {string}
       *  HTML markup for the weight toggle button content.
       */
      toggleButtonContent: (show) => {
        const classes = [
          'action-link',
          'action-link--extrasmall',
          'tabledrag-toggle-weight',
        ];
        let text = '';
        if (show) {
          classes.push('action-link--icon-hide');
          text = Drupal.t('Hide row weights');
        } else {
          classes.push('action-link--icon-show');
          text = Drupal.t('Show row weights');
        }
        return `<span class="${classes.join(' ')}">${text}</a>`;
      },

      /**
       * Constructs the wrapper for the initial content of the drag cell.
       *
       * @return {string}
       *   A string representing a DOM fragment.
       */
      tableDragCellContentWrapper() {
        return '<div class="tabledrag-cell-content__item"></div>';
      },

      /**
       * Constructs the wrapper for the whole table drag cell.
       *
       * @return {string}
       *   A string representing a DOM fragment.
       */
      tableDragCellItemsWrapper() {
        return '<div class="tabledrag-cell-content"></div>';
      },
    },
  );
})(jQuery, Drupal);
;
/*!
 * jQuery Form Plugin
 * version: 4.3.0
 * Requires jQuery v1.7.2 or later
 * Project repository: https://github.com/jquery-form/form

 * Copyright 2017 Kevin Morris
 * Copyright 2006 M. Alsup

 * Dual licensed under the LGPL-2.1+ or MIT licenses
 * https://github.com/jquery-form/form#license

 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 */
!function(r){"function"==typeof define&&define.amd?define(["jquery"],r):"object"==typeof module&&module.exports?module.exports=function(e,t){return void 0===t&&(t="undefined"!=typeof window?require("jquery"):require("jquery")(e)),r(t),t}:r(jQuery)}(function(q){"use strict";var m=/\r?\n/g,S={};S.fileapi=void 0!==q('<input type="file">').get(0).files,S.formdata=void 0!==window.FormData;var _=!!q.fn.prop;function o(e){var t=e.data;e.isDefaultPrevented()||(e.preventDefault(),q(e.target).closest("form").ajaxSubmit(t))}function i(e){var t=e.target,r=q(t);if(!r.is("[type=submit],[type=image]")){var a=r.closest("[type=submit]");if(0===a.length)return;t=a[0]}var n,o=t.form;"image"===(o.clk=t).type&&(void 0!==e.offsetX?(o.clk_x=e.offsetX,o.clk_y=e.offsetY):"function"==typeof q.fn.offset?(n=r.offset(),o.clk_x=e.pageX-n.left,o.clk_y=e.pageY-n.top):(o.clk_x=e.pageX-t.offsetLeft,o.clk_y=e.pageY-t.offsetTop)),setTimeout(function(){o.clk=o.clk_x=o.clk_y=null},100)}function N(){var e;q.fn.ajaxSubmit.debug&&(e="[jquery.form] "+Array.prototype.join.call(arguments,""),window.console&&window.console.log?window.console.log(e):window.opera&&window.opera.postError&&window.opera.postError(e))}q.fn.attr2=function(){if(!_)return this.attr.apply(this,arguments);var e=this.prop.apply(this,arguments);return e&&e.jquery||"string"==typeof e?e:this.attr.apply(this,arguments)},q.fn.ajaxSubmit=function(M,e,t,r){if(!this.length)return N("ajaxSubmit: skipping submit process - no element selected"),this;var O,a,n,o,X=this;"function"==typeof M?M={success:M}:"string"==typeof M||!1===M&&0<arguments.length?(M={url:M,data:e,dataType:t},"function"==typeof r&&(M.success=r)):void 0===M&&(M={}),O=M.method||M.type||this.attr2("method"),n=(n=(n="string"==typeof(a=M.url||this.attr2("action"))?q.trim(a):"")||window.location.href||"")&&(n.match(/^([^#]+)/)||[])[1],o=/(MSIE|Trident)/.test(navigator.userAgent||"")&&/^https/i.test(window.location.href||"")?"javascript:false":"about:blank",M=q.extend(!0,{url:n,success:q.ajaxSettings.success,type:O||q.ajaxSettings.type,iframeSrc:o},M);var i={};if(this.trigger("form-pre-serialize",[this,M,i]),i.veto)return N("ajaxSubmit: submit vetoed via form-pre-serialize trigger"),this;if(M.beforeSerialize&&!1===M.beforeSerialize(this,M))return N("ajaxSubmit: submit aborted via beforeSerialize callback"),this;var s=M.traditional;void 0===s&&(s=q.ajaxSettings.traditional);var u,c,C=[],l=this.formToArray(M.semantic,C,M.filtering);if(M.data&&(c=q.isFunction(M.data)?M.data(l):M.data,M.extraData=c,u=q.param(c,s)),M.beforeSubmit&&!1===M.beforeSubmit(l,this,M))return N("ajaxSubmit: submit aborted via beforeSubmit callback"),this;if(this.trigger("form-submit-validate",[l,this,M,i]),i.veto)return N("ajaxSubmit: submit vetoed via form-submit-validate trigger"),this;var f=q.param(l,s);u&&(f=f?f+"&"+u:u),"GET"===M.type.toUpperCase()?(M.url+=(0<=M.url.indexOf("?")?"&":"?")+f,M.data=null):M.data=f;var d,m,p,h=[];M.resetForm&&h.push(function(){X.resetForm()}),M.clearForm&&h.push(function(){X.clearForm(M.includeHidden)}),!M.dataType&&M.target?(d=M.success||function(){},h.push(function(e,t,r){var a=arguments,n=M.replaceTarget?"replaceWith":"html";q(M.target)[n](e).each(function(){d.apply(this,a)})})):M.success&&(q.isArray(M.success)?q.merge(h,M.success):h.push(M.success)),M.success=function(e,t,r){for(var a=M.context||this,n=0,o=h.length;n<o;n++)h[n].apply(a,[e,t,r||X,X])},M.error&&(m=M.error,M.error=function(e,t,r){var a=M.context||this;m.apply(a,[e,t,r,X])}),M.complete&&(p=M.complete,M.complete=function(e,t){var r=M.context||this;p.apply(r,[e,t,X])});var v=0<q("input[type=file]:enabled",this).filter(function(){return""!==q(this).val()}).length,g="multipart/form-data",x=X.attr("enctype")===g||X.attr("encoding")===g,y=S.fileapi&&S.formdata;N("fileAPI :"+y);var b,T=(v||x)&&!y;!1!==M.iframe&&(M.iframe||T)?M.closeKeepAlive?q.get(M.closeKeepAlive,function(){b=w(l)}):b=w(l):b=(v||x)&&y?function(e){for(var r=new FormData,t=0;t<e.length;t++)r.append(e[t].name,e[t].value);if(M.extraData){var a=function(e){var t,r,a=q.param(e,M.traditional).split("&"),n=a.length,o=[];for(t=0;t<n;t++)a[t]=a[t].replace(/\+/g," "),r=a[t].split("="),o.push([decodeURIComponent(r[0]),decodeURIComponent(r[1])]);return o}(M.extraData);for(t=0;t<a.length;t++)a[t]&&r.append(a[t][0],a[t][1])}M.data=null;var n=q.extend(!0,{},q.ajaxSettings,M,{contentType:!1,processData:!1,cache:!1,type:O||"POST"});M.uploadProgress&&(n.xhr=function(){var e=q.ajaxSettings.xhr();return e.upload&&e.upload.addEventListener("progress",function(e){var t=0,r=e.loaded||e.position,a=e.total;e.lengthComputable&&(t=Math.ceil(r/a*100)),M.uploadProgress(e,r,a,t)},!1),e});n.data=null;var o=n.beforeSend;return n.beforeSend=function(e,t){M.formData?t.data=M.formData:t.data=r,o&&o.call(this,e,t)},q.ajax(n)}(l):q.ajax(M),X.removeData("jqxhr").data("jqxhr",b);for(var j=0;j<C.length;j++)C[j]=null;return this.trigger("form-submit-notify",[this,M]),this;function w(e){var t,r,l,f,o,d,m,p,a,n,h,v,i=X[0],g=q.Deferred();if(g.abort=function(e){p.abort(e)},e)for(r=0;r<C.length;r++)t=q(C[r]),_?t.prop("disabled",!1):t.removeAttr("disabled");(l=q.extend(!0,{},q.ajaxSettings,M)).context=l.context||l,o="jqFormIO"+(new Date).getTime();var s=i.ownerDocument,u=X.closest("body");if(l.iframeTarget?(n=(d=q(l.iframeTarget,s)).attr2("name"))?o=n:d.attr2("name",o):(d=q('<iframe name="'+o+'" src="'+l.iframeSrc+'" />',s)).css({position:"absolute",top:"-1000px",left:"-1000px"}),m=d[0],p={aborted:0,responseText:null,responseXML:null,status:0,statusText:"n/a",getAllResponseHeaders:function(){},getResponseHeader:function(){},setRequestHeader:function(){},abort:function(e){var t="timeout"===e?"timeout":"aborted";N("aborting upload... "+t),this.aborted=1;try{m.contentWindow.document.execCommand&&m.contentWindow.document.execCommand("Stop")}catch(e){}d.attr("src",l.iframeSrc),p.error=t,l.error&&l.error.call(l.context,p,t,e),f&&q.event.trigger("ajaxError",[p,l,t]),l.complete&&l.complete.call(l.context,p,t)}},(f=l.global)&&0==q.active++&&q.event.trigger("ajaxStart"),f&&q.event.trigger("ajaxSend",[p,l]),l.beforeSend&&!1===l.beforeSend.call(l.context,p,l))return l.global&&q.active--,g.reject(),g;if(p.aborted)return g.reject(),g;(a=i.clk)&&(n=a.name)&&!a.disabled&&(l.extraData=l.extraData||{},l.extraData[n]=a.value,"image"===a.type&&(l.extraData[n+".x"]=i.clk_x,l.extraData[n+".y"]=i.clk_y));var x=1,y=2;function b(t){var r=null;try{t.contentWindow&&(r=t.contentWindow.document)}catch(e){N("cannot get iframe.contentWindow document: "+e)}if(r)return r;try{r=t.contentDocument?t.contentDocument:t.document}catch(e){N("cannot get iframe.contentDocument: "+e),r=t.document}return r}var c=q("meta[name=csrf-token]").attr("content"),T=q("meta[name=csrf-param]").attr("content");function j(){var e=X.attr2("target"),t=X.attr2("action"),r=X.attr("enctype")||X.attr("encoding")||"multipart/form-data";i.setAttribute("target",o),O&&!/post/i.test(O)||i.setAttribute("method","POST"),t!==l.url&&i.setAttribute("action",l.url),l.skipEncodingOverride||O&&!/post/i.test(O)||X.attr({encoding:"multipart/form-data",enctype:"multipart/form-data"}),l.timeout&&(v=setTimeout(function(){h=!0,A(x)},l.timeout));var a=[];try{if(l.extraData)for(var n in l.extraData)l.extraData.hasOwnProperty(n)&&(q.isPlainObject(l.extraData[n])&&l.extraData[n].hasOwnProperty("name")&&l.extraData[n].hasOwnProperty("value")?a.push(q('<input type="hidden" name="'+l.extraData[n].name+'">',s).val(l.extraData[n].value).appendTo(i)[0]):a.push(q('<input type="hidden" name="'+n+'">',s).val(l.extraData[n]).appendTo(i)[0]));l.iframeTarget||d.appendTo(u),m.attachEvent?m.attachEvent("onload",A):m.addEventListener("load",A,!1),setTimeout(function e(){try{var t=b(m).readyState;N("state = "+t),t&&"uninitialized"===t.toLowerCase()&&setTimeout(e,50)}catch(e){N("Server abort: ",e," (",e.name,")"),A(y),v&&clearTimeout(v),v=void 0}},15);try{i.submit()}catch(e){document.createElement("form").submit.apply(i)}}finally{i.setAttribute("action",t),i.setAttribute("enctype",r),e?i.setAttribute("target",e):X.removeAttr("target"),q(a).remove()}}T&&c&&(l.extraData=l.extraData||{},l.extraData[T]=c),l.forceSync?j():setTimeout(j,10);var w,S,k,D=50;function A(e){if(!p.aborted&&!k){if((S=b(m))||(N("cannot access response document"),e=y),e===x&&p)return p.abort("timeout"),void g.reject(p,"timeout");if(e===y&&p)return p.abort("server abort"),void g.reject(p,"error","server abort");if(S&&S.location.href!==l.iframeSrc||h){m.detachEvent?m.detachEvent("onload",A):m.removeEventListener("load",A,!1);var t,r="success";try{if(h)throw"timeout";var a="xml"===l.dataType||S.XMLDocument||q.isXMLDoc(S);if(N("isXml="+a),!a&&window.opera&&(null===S.body||!S.body.innerHTML)&&--D)return N("requeing onLoad callback, DOM not available"),void setTimeout(A,250);var n=S.body?S.body:S.documentElement;p.responseText=n?n.innerHTML:null,p.responseXML=S.XMLDocument?S.XMLDocument:S,a&&(l.dataType="xml"),p.getResponseHeader=function(e){return{"content-type":l.dataType}[e.toLowerCase()]},n&&(p.status=Number(n.getAttribute("status"))||p.status,p.statusText=n.getAttribute("statusText")||p.statusText);var o,i,s,u=(l.dataType||"").toLowerCase(),c=/(json|script|text)/.test(u);c||l.textarea?(o=S.getElementsByTagName("textarea")[0])?(p.responseText=o.value,p.status=Number(o.getAttribute("status"))||p.status,p.statusText=o.getAttribute("statusText")||p.statusText):c&&(i=S.getElementsByTagName("pre")[0],s=S.getElementsByTagName("body")[0],i?p.responseText=i.textContent?i.textContent:i.innerText:s&&(p.responseText=s.textContent?s.textContent:s.innerText)):"xml"===u&&!p.responseXML&&p.responseText&&(p.responseXML=F(p.responseText));try{w=E(p,u,l)}catch(e){r="parsererror",p.error=t=e||r}}catch(e){N("error caught: ",e),r="error",p.error=t=e||r}p.aborted&&(N("upload aborted"),r=null),p.status&&(r=200<=p.status&&p.status<300||304===p.status?"success":"error"),"success"===r?(l.success&&l.success.call(l.context,w,"success",p),g.resolve(p.responseText,"success",p),f&&q.event.trigger("ajaxSuccess",[p,l])):r&&(void 0===t&&(t=p.statusText),l.error&&l.error.call(l.context,p,r,t),g.reject(p,"error",t),f&&q.event.trigger("ajaxError",[p,l,t])),f&&q.event.trigger("ajaxComplete",[p,l]),f&&!--q.active&&q.event.trigger("ajaxStop"),l.complete&&l.complete.call(l.context,p,r),k=!0,l.timeout&&clearTimeout(v),setTimeout(function(){l.iframeTarget?d.attr("src",l.iframeSrc):d.remove(),p.responseXML=null},100)}}}var F=q.parseXML||function(e,t){return window.ActiveXObject?((t=new ActiveXObject("Microsoft.XMLDOM")).async="false",t.loadXML(e)):t=(new DOMParser).parseFromString(e,"text/xml"),t&&t.documentElement&&"parsererror"!==t.documentElement.nodeName?t:null},L=q.parseJSON||function(e){return window.eval("("+e+")")},E=function(e,t,r){var a=e.getResponseHeader("content-type")||"",n=("xml"===t||!t)&&0<=a.indexOf("xml"),o=n?e.responseXML:e.responseText;return n&&"parsererror"===o.documentElement.nodeName&&q.error&&q.error("parsererror"),r&&r.dataFilter&&(o=r.dataFilter(o,t)),"string"==typeof o&&(("json"===t||!t)&&0<=a.indexOf("json")?o=L(o):("script"===t||!t)&&0<=a.indexOf("javascript")&&q.globalEval(o)),o};return g}},q.fn.ajaxForm=function(e,t,r,a){if(("string"==typeof e||!1===e&&0<arguments.length)&&(e={url:e,data:t,dataType:r},"function"==typeof a&&(e.success=a)),(e=e||{}).delegation=e.delegation&&q.isFunction(q.fn.on),e.delegation||0!==this.length)return e.delegation?(q(document).off("submit.form-plugin",this.selector,o).off("click.form-plugin",this.selector,i).on("submit.form-plugin",this.selector,e,o).on("click.form-plugin",this.selector,e,i),this):(e.beforeFormUnbind&&e.beforeFormUnbind(this,e),this.ajaxFormUnbind().on("submit.form-plugin",e,o).on("click.form-plugin",e,i));var n={s:this.selector,c:this.context};return!q.isReady&&n.s?(N("DOM not ready, queuing ajaxForm"),q(function(){q(n.s,n.c).ajaxForm(e)})):N("terminating; zero elements found by selector"+(q.isReady?"":" (DOM not ready)")),this},q.fn.ajaxFormUnbind=function(){return this.off("submit.form-plugin click.form-plugin")},q.fn.formToArray=function(e,t,r){var a=[];if(0===this.length)return a;var n,o,i,s,u,c,l,f,d,m,p=this[0],h=this.attr("id"),v=(v=e||void 0===p.elements?p.getElementsByTagName("*"):p.elements)&&q.makeArray(v);if(h&&(e||/(Edge|Trident)\//.test(navigator.userAgent))&&(n=q(':input[form="'+h+'"]').get()).length&&(v=(v||[]).concat(n)),!v||!v.length)return a;for(q.isFunction(r)&&(v=q.map(v,r)),o=0,c=v.length;o<c;o++)if((m=(u=v[o]).name)&&!u.disabled)if(e&&p.clk&&"image"===u.type)p.clk===u&&(a.push({name:m,value:q(u).val(),type:u.type}),a.push({name:m+".x",value:p.clk_x},{name:m+".y",value:p.clk_y}));else if((s=q.fieldValue(u,!0))&&s.constructor===Array)for(t&&t.push(u),i=0,l=s.length;i<l;i++)a.push({name:m,value:s[i]});else if(S.fileapi&&"file"===u.type){t&&t.push(u);var g=u.files;if(g.length)for(i=0;i<g.length;i++)a.push({name:m,value:g[i],type:u.type});else a.push({name:m,value:"",type:u.type})}else null!=s&&(t&&t.push(u),a.push({name:m,value:s,type:u.type,required:u.required}));return e||!p.clk||(m=(d=(f=q(p.clk))[0]).name)&&!d.disabled&&"image"===d.type&&(a.push({name:m,value:f.val()}),a.push({name:m+".x",value:p.clk_x},{name:m+".y",value:p.clk_y})),a},q.fn.formSerialize=function(e){return q.param(this.formToArray(e))},q.fn.fieldSerialize=function(n){var o=[];return this.each(function(){var e=this.name;if(e){var t=q.fieldValue(this,n);if(t&&t.constructor===Array)for(var r=0,a=t.length;r<a;r++)o.push({name:e,value:t[r]});else null!=t&&o.push({name:this.name,value:t})}}),q.param(o)},q.fn.fieldValue=function(e){for(var t=[],r=0,a=this.length;r<a;r++){var n=this[r],o=q.fieldValue(n,e);null==o||o.constructor===Array&&!o.length||(o.constructor===Array?q.merge(t,o):t.push(o))}return t},q.fieldValue=function(e,t){var r=e.name,a=e.type,n=e.tagName.toLowerCase();if(void 0===t&&(t=!0),t&&(!r||e.disabled||"reset"===a||"button"===a||("checkbox"===a||"radio"===a)&&!e.checked||("submit"===a||"image"===a)&&e.form&&e.form.clk!==e||"select"===n&&-1===e.selectedIndex))return null;if("select"!==n)return q(e).val().replace(m,"\r\n");var o=e.selectedIndex;if(o<0)return null;for(var i=[],s=e.options,u="select-one"===a,c=u?o+1:s.length,l=u?o:0;l<c;l++){var f=s[l];if(f.selected&&!f.disabled){var d=(d=f.value)||(f.attributes&&f.attributes.value&&!f.attributes.value.specified?f.text:f.value);if(u)return d;i.push(d)}}return i},q.fn.clearForm=function(e){return this.each(function(){q("input,select,textarea",this).clearFields(e)})},q.fn.clearFields=q.fn.clearInputs=function(r){var a=/^(?:color|date|datetime|email|month|number|password|range|search|tel|text|time|url|week)$/i;return this.each(function(){var e=this.type,t=this.tagName.toLowerCase();a.test(e)||"textarea"===t?this.value="":"checkbox"===e||"radio"===e?this.checked=!1:"select"===t?this.selectedIndex=-1:"file"===e?/MSIE/.test(navigator.userAgent)?q(this).replaceWith(q(this).clone(!0)):q(this).val(""):r&&(!0===r&&/hidden/.test(e)||"string"==typeof r&&q(this).is(r))&&(this.value="")})},q.fn.resetForm=function(){return this.each(function(){var t=q(this),e=this.tagName.toLowerCase();switch(e){case"input":this.checked=this.defaultChecked;case"textarea":return this.value=this.defaultValue,!0;case"option":case"optgroup":var r=t.parents("select");return r.length&&r[0].multiple?"option"===e?this.selected=this.defaultSelected:t.find("option").resetForm():r.resetForm(),!0;case"select":return t.find("option").each(function(e){if(this.selected=this.defaultSelected,this.defaultSelected&&!t[0].multiple)return t[0].selectedIndex=e,!1}),!0;case"label":var a=q(t.attr("for")),n=t.find("input,select,textarea");return a[0]&&n.unshift(a[0]),n.resetForm(),!0;case"form":return"function"!=typeof this.reset&&("object"!=typeof this.reset||this.reset.nodeType)||this.reset(),!0;default:return t.find("form,input,label,select,textarea").resetForm(),!0}})},q.fn.enable=function(e){return void 0===e&&(e=!0),this.each(function(){this.disabled=!e})},q.fn.selected=function(r){return void 0===r&&(r=!0),this.each(function(){var e,t=this.type;"checkbox"===t||"radio"===t?this.checked=r:"option"===this.tagName.toLowerCase()&&(e=q(this).parent("select"),r&&e[0]&&"select-one"===e[0].type&&e.find("option").selected(!1),this.selected=r)})},q.fn.ajaxSubmit.debug=!1});

;
/**
 * @file
 * Provides a JavaScript API to broadcast text editor configuration changes.
 *
 * Filter implementations may listen to the drupalEditorFeatureAdded,
 * drupalEditorFeatureRemoved, and drupalEditorFeatureRemoved events on document
 * to automatically adjust their settings based on the editor configuration.
 */

(function ($, Drupal, document) {
  /**
   * Editor configuration namespace.
   *
   * @namespace
   */
  Drupal.editorConfiguration = {
    /**
     * Must be called by a specific text editor's configuration whenever a
     * feature is added by the user.
     *
     * Triggers the drupalEditorFeatureAdded event on the document, which
     * receives a {@link Drupal.EditorFeature} object.
     *
     * @param {Drupal.EditorFeature} feature
     *   A text editor feature object.
     *
     * @fires event:drupalEditorFeatureAdded
     */
    addedFeature(feature) {
      $(document).trigger('drupalEditorFeatureAdded', feature);
    },

    /**
     * Must be called by a specific text editor's configuration whenever a
     * feature is removed by the user.
     *
     * Triggers the drupalEditorFeatureRemoved event on the document, which
     * receives a {@link Drupal.EditorFeature} object.
     *
     * @param {Drupal.EditorFeature} feature
     *   A text editor feature object.
     *
     * @fires event:drupalEditorFeatureRemoved
     */
    removedFeature(feature) {
      $(document).trigger('drupalEditorFeatureRemoved', feature);
    },

    /**
     * Must be called by a specific text editor's configuration whenever a
     * feature is modified, i.e. has different rules.
     *
     * For example when the "Bold" button is configured to use the `<b>` tag
     * instead of the `<strong>` tag.
     *
     * Triggers the drupalEditorFeatureModified event on the document, which
     * receives a {@link Drupal.EditorFeature} object.
     *
     * @param {Drupal.EditorFeature} feature
     *   A text editor feature object.
     *
     * @fires event:drupalEditorFeatureModified
     */
    modifiedFeature(feature) {
      $(document).trigger('drupalEditorFeatureModified', feature);
    },

    /**
     * May be called by a specific text editor's configuration whenever a
     * feature is being added, to check whether it would require the filter
     * settings to be updated.
     *
     * The canonical use case is when a text editor is being enabled:
     * preferably
     * this would not cause the filter settings to be changed; rather, the
     * default set of buttons (features) for the text editor should adjust
     * itself to not cause filter setting changes.
     *
     * Note: for filters to integrate with this functionality, it is necessary
     * that they implement
     * `Drupal.filterSettingsForEditors[filterID].getRules()`.
     *
     * @param {Drupal.EditorFeature} feature
     *   A text editor feature object.
     *
     * @return {boolean}
     *   Whether the given feature is allowed by the current filters.
     */
    featureIsAllowedByFilters(feature) {
      /**
       * Provided a section of a feature or filter rule, checks if no property
       * values are defined for all properties: attributes, classes and styles.
       *
       * @param {object} section
       *   The section to check.
       *
       * @return {boolean}
       *   Returns true if the section has empty properties, false otherwise.
       */
      function emptyProperties(section) {
        return (
          section.attributes.length === 0 &&
          section.classes.length === 0 &&
          section.styles.length === 0
        );
      }

      /**
       * Generate the universe U of possible values that can result from the
       * feature's rules' requirements.
       *
       * This generates an object of this form:
       *   var universe = {
       *     a: {
       *       'touchedByAllowedPropertyRule': false,
       *       'tag': false,
       *       'attributes:href': false,
       *       'classes:external': false,
       *     },
       *     strong: {
       *       'touchedByAllowedPropertyRule': false,
       *       'tag': false,
       *     },
       *     img: {
       *       'touchedByAllowedPropertyRule': false,
       *       'tag': false,
       *       'attributes:src': false
       *     }
       *   };
       *
       * In this example, the given text editor feature resulted in the above
       * universe, which shows that it must be allowed to generate the a,
       * strong and img tags. For the a tag, it must be able to set the "href"
       * attribute and the "external" class. For the strong tag, no further
       * properties are required. For the img tag, the "src" attribute is
       * required. The "tag" key is used to track whether that tag was
       * explicitly allowed by one of the filter's rules. The
       * "touchedByAllowedPropertyRule" key is used for state tracking that is
       * essential for filterStatusAllowsFeature() to be able to reason: when
       * all of a filter's rules have been applied, and none of the forbidden
       * rules matched (which would have resulted in early termination) yet the
       * universe has not been made empty (which would be the end result if
       * everything in the universe were explicitly allowed), then this piece
       * of state data enables us to determine whether a tag whose properties
       * were not all explicitly allowed are in fact still allowed, because its
       * tag was explicitly allowed and there were no filter rules applying
       * "allowed tag property value" restrictions for this particular tag.
       *
       * @param {object} feature
       *   The feature in question.
       *
       * @return {object}
       *   The universe generated.
       *
       * @see findPropertyValueOnTag()
       * @see filterStatusAllowsFeature()
       */
      function generateUniverseFromFeatureRequirements(feature) {
        const properties = ['attributes', 'styles', 'classes'];
        const universe = {};

        for (let r = 0; r < feature.rules.length; r++) {
          const featureRule = feature.rules[r];

          // For each tag required by this feature rule, create a basic entry in
          // the universe.
          const requiredTags = featureRule.required.tags;
          for (let t = 0; t < requiredTags.length; t++) {
            universe[requiredTags[t]] = {
              // Whether this tag was allowed or not.
              tag: false,
              // Whether any filter rule that applies to this tag had an allowed
              // property rule. i.e. will become true if >=1 filter rule has >=1
              // allowed property rule.
              touchedByAllowedPropertyRule: false,
            };
          }

          // If no required properties are defined for this rule, we can move on
          // to the next feature.
          if (emptyProperties(featureRule.required)) {
            continue;
          }

          // Expand the existing universe, assume that each tags' property
          // value is disallowed. If the filter rules allow everything in the
          // feature's universe, then the feature is allowed.
          for (let p = 0; p < properties.length; p++) {
            const property = properties[p];
            for (let pv = 0; pv < featureRule.required[property].length; pv++) {
              const propertyValue = featureRule.required[property];
              universe[requiredTags][`${property}:${propertyValue}`] = false;
            }
          }
        }

        return universe;
      }

      /**
       * Finds out if a specific property value (potentially containing
       * wildcards) exists on the given tag. When the "allowing" parameter
       * equals true, the universe will be updated if that specific property
       * value exists. Returns true if found, false otherwise.
       *
       * @param {object} universe
       *   The universe to check.
       * @param {string} tag
       *   The tag to look for.
       * @param {string} property
       *   The property to check.
       * @param {string} propertyValue
       *   The property value to check.
       * @param {boolean} allowing
       *   Whether to update the universe or not.
       *
       * @return {boolean}
       *   Returns true if found, false otherwise.
       */
      function findPropertyValueOnTag(
        universe,
        tag,
        property,
        propertyValue,
        allowing,
      ) {
        // If the tag does not exist in the universe, then it definitely can't
        // have this specific property value.
        if (!universe.hasOwnProperty(tag)) {
          return false;
        }

        const key = `${property}:${propertyValue}`;

        // Track whether a tag was touched by a filter rule that allows specific
        // property values on this particular tag.
        // @see generateUniverseFromFeatureRequirements
        if (allowing) {
          universe[tag].touchedByAllowedPropertyRule = true;
        }

        // The simple case: no wildcard in property value.
        if (propertyValue.indexOf('*') === -1) {
          if (
            universe.hasOwnProperty(tag) &&
            universe[tag].hasOwnProperty(key)
          ) {
            if (allowing) {
              universe[tag][key] = true;
            }
            return true;
          }
          return false;
        }
        // The complex case: wildcard in property value.

        let atLeastOneFound = false;
        const regex = key.replace(/\*/g, '[^ ]*');
        Object.keys(universe[tag]).forEach((key) => {
          if (key.match(regex)) {
            atLeastOneFound = true;
            if (allowing) {
              universe[tag][key] = true;
            }
          }
        });
        return atLeastOneFound;
      }

      /**
       * Calls findPropertyValuesOnAllTags for all tags in the universe.
       *
       * @param {object} universe
       *   The universe to check.
       * @param {string} property
       *   The property to check.
       * @param {Array} propertyValues
       *   Values of the property to check.
       * @param {boolean} allowing
       *   Whether to update the universe or not.
       *
       * @return {boolean}
       *   Returns true if found, false otherwise.
       */
      function findPropertyValuesOnAllTags(
        universe,
        property,
        propertyValues,
        allowing,
      ) {
        let atLeastOneFound = false;
        Object.keys(universe).forEach((tag) => {
          if (
            // eslint-disable-next-line no-use-before-define
            findPropertyValuesOnTag(
              universe,
              tag,
              property,
              propertyValues,
              allowing,
            )
          ) {
            atLeastOneFound = true;
          }
        });
        return atLeastOneFound;
      }

      /**
       * Calls findPropertyValueOnTag on the given tag for every property value
       * that is listed in the "propertyValues" parameter. Supports the wildcard
       * tag.
       *
       * @param {object} universe
       *   The universe to check.
       * @param {string} tag
       *   The tag to look for.
       * @param {string} property
       *   The property to check.
       * @param {Array} propertyValues
       *   Values of the property to check.
       * @param {boolean} allowing
       *   Whether to update the universe or not.
       *
       * @return {boolean}
       *   Returns true if found, false otherwise.
       */
      function findPropertyValuesOnTag(
        universe,
        tag,
        property,
        propertyValues,
        allowing,
      ) {
        // Detect the wildcard case.
        if (tag === '*') {
          return findPropertyValuesOnAllTags(
            universe,
            property,
            propertyValues,
            allowing,
          );
        }

        let atLeastOneFound = false;
        propertyValues.forEach((propertyValue) => {
          if (
            findPropertyValueOnTag(
              universe,
              tag,
              property,
              propertyValue,
              allowing,
            )
          ) {
            atLeastOneFound = true;
          }
        });
        return atLeastOneFound;
      }

      /**
       * Calls deleteFromUniverseIfAllowed for all tags in the universe.
       *
       * @param {object} universe
       *   The universe to delete from.
       *
       * @return {boolean}
       *   Whether something was deleted from the universe.
       */
      function deleteAllTagsFromUniverseIfAllowed(universe) {
        let atLeastOneDeleted = false;
        Object.keys(universe).forEach((tag) => {
          // eslint-disable-next-line no-use-before-define
          if (deleteFromUniverseIfAllowed(universe, tag)) {
            atLeastOneDeleted = true;
          }
        });
        return atLeastOneDeleted;
      }

      /**
       * Deletes a tag from the universe if the tag itself and each of its
       * properties are marked as allowed.
       *
       * @param {object} universe
       *   The universe to delete from.
       * @param {string} tag
       *   The tag to check.
       *
       * @return {boolean}
       *   Whether something was deleted from the universe.
       */
      function deleteFromUniverseIfAllowed(universe, tag) {
        // Detect the wildcard case.
        if (tag === '*') {
          return deleteAllTagsFromUniverseIfAllowed(universe);
        }
        if (
          universe.hasOwnProperty(tag) &&
          Object.keys(universe[tag])
            .filter((key) => key !== 'touchedByAllowedPropertyRule')
            .every((key) => universe[tag][key])
        ) {
          delete universe[tag];
          return true;
        }
        return false;
      }

      /**
       * Checks if any filter rule forbids either a tag or a tag property value
       * that exists in the universe.
       *
       * @param {object} universe
       *   Universe to check.
       * @param {object} filterStatus
       *   Filter status to use for check.
       *
       * @return {boolean}
       *   Whether any filter rule forbids something in the universe.
       */
      function anyForbiddenFilterRuleMatches(universe, filterStatus) {
        const properties = ['attributes', 'styles', 'classes'];

        // Check if a tag in the universe is forbidden.
        const allRequiredTags = Object.keys(universe);
        let filterRule;
        for (let i = 0; i < filterStatus.rules.length; i++) {
          filterRule = filterStatus.rules[i];
          if (filterRule.allow === false) {
            const intersection = filterRule.tags.filter((tag) =>
              allRequiredTags.includes(tag),
            );
            if (intersection.length > 0) {
              return true;
            }
          }
        }

        // Check if a property value of a tag in the universe is forbidden.
        // For all filter rules…
        for (let n = 0; n < filterStatus.rules.length; n++) {
          filterRule = filterStatus.rules[n];
          // … if there are tags with restricted property values …
          if (
            filterRule.restrictedTags.tags.length &&
            !emptyProperties(filterRule.restrictedTags.forbidden)
          ) {
            // … for all those tags …
            for (let j = 0; j < filterRule.restrictedTags.tags.length; j++) {
              const tag = filterRule.restrictedTags.tags[j];
              // … then iterate over all properties …
              for (let k = 0; k < properties.length; k++) {
                const property = properties[k];
                // … and return true if just one of the forbidden property
                // values for this tag and property is listed in the universe.
                if (
                  findPropertyValuesOnTag(
                    universe,
                    tag,
                    property,
                    filterRule.restrictedTags.forbidden[property],
                    false,
                  )
                ) {
                  return true;
                }
              }
            }
          }
        }

        return false;
      }

      /**
       * Applies every filter rule's explicit allowing of a tag or a tag
       * property value to the universe. Whenever both the tag and all of its
       * required property values are marked as explicitly allowed, they are
       * deleted from the universe.
       *
       * @param {object} universe
       *   Universe to delete from.
       * @param {object} filterStatus
       *   The filter status in question.
       */
      function markAllowedTagsAndPropertyValues(universe, filterStatus) {
        const properties = ['attributes', 'styles', 'classes'];

        // Check if a tag in the universe is allowed.
        let filterRule;
        let tag;
        for (
          let l = 0;
          Object.keys(universe).length > 0 && l < filterStatus.rules.length;
          l++
        ) {
          filterRule = filterStatus.rules[l];
          if (filterRule.allow === true) {
            for (
              let m = 0;
              Object.keys(universe).length > 0 && m < filterRule.tags.length;
              m++
            ) {
              tag = filterRule.tags[m];
              if (universe.hasOwnProperty(tag)) {
                universe[tag].tag = true;
                deleteFromUniverseIfAllowed(universe, tag);
              }
            }
          }
        }

        // Check if a property value of a tag in the universe is allowed.
        // For all filter rules…
        for (
          let i = 0;
          Object.keys(universe).length > 0 && i < filterStatus.rules.length;
          i++
        ) {
          filterRule = filterStatus.rules[i];
          // … if there are tags with restricted property values …
          if (
            filterRule.restrictedTags.tags.length &&
            !emptyProperties(filterRule.restrictedTags.allowed)
          ) {
            // … for all those tags …
            for (
              let j = 0;
              Object.keys(universe).length > 0 &&
              j < filterRule.restrictedTags.tags.length;
              j++
            ) {
              tag = filterRule.restrictedTags.tags[j];
              // … then iterate over all properties …
              for (let k = 0; k < properties.length; k++) {
                const property = properties[k];
                // … and try to delete this tag from the universe if just one
                // of the allowed property values for this tag and property is
                // listed in the universe. (Because everything might be allowed
                // now.)
                if (
                  findPropertyValuesOnTag(
                    universe,
                    tag,
                    property,
                    filterRule.restrictedTags.allowed[property],
                    true,
                  )
                ) {
                  deleteFromUniverseIfAllowed(universe, tag);
                }
              }
            }
          }
        }
      }

      /**
       * Checks whether the current status of a filter allows a specific feature
       * by building the universe of potential values from the feature's
       * requirements and then checking whether anything in the filter prevents
       * that.
       *
       * @param {object} filterStatus
       *   The filter status in question.
       * @param {object} feature
       *   The feature requested.
       *
       * @return {boolean}
       *   Whether the current status of the filter allows specified feature.
       *
       * @see generateUniverseFromFeatureRequirements()
       */
      function filterStatusAllowsFeature(filterStatus, feature) {
        // An inactive filter by definition allows the feature.
        if (!filterStatus.active) {
          return true;
        }

        // A feature that specifies no rules has no HTML requirements and is
        // hence allowed by definition.
        if (feature.rules.length === 0) {
          return true;
        }

        // Analogously for a filter that specifies no rules.
        if (filterStatus.rules.length === 0) {
          return true;
        }

        // Generate the universe U of possible values that can result from the
        // feature's rules' requirements.
        const universe = generateUniverseFromFeatureRequirements(feature);

        // If anything that is in the universe (and is thus required by the
        // feature) is forbidden by any of the filter's rules, then this filter
        // does not allow this feature.
        if (anyForbiddenFilterRuleMatches(universe, filterStatus)) {
          return false;
        }

        // Mark anything in the universe that is allowed by any of the filter's
        // rules as allowed. If everything is explicitly allowed, then the
        // universe will become empty.
        markAllowedTagsAndPropertyValues(universe, filterStatus);

        // If there was at least one filter rule allowing tags, then everything
        // in the universe must be allowed for this feature to be allowed, and
        // thus by now it must be empty. However, it is still possible that the
        // filter allows the feature, due to no rules for allowing tag property
        // values and/or rules for forbidding tag property values. For details:
        // see the comments below.
        // @see generateUniverseFromFeatureRequirements()
        if (filterStatus.rules.some(({ allow }) => allow)) {
          // If the universe is empty, then everything was explicitly allowed
          // and our job is done: this filter allows this feature!
          if (Object.keys(universe).length === 0) {
            return true;
          }
          // Otherwise, it is still possible that this feature is allowed.

          // Every tag must be explicitly allowed if there are filter rules
          // doing tag whitelisting.
          if (
            !Object.keys(universe).every((tagName) => universe[tagName].tag)
          ) {
            return false;
          }
          // Every tag was explicitly allowed, but since the universe is not
          // empty, one or more tag properties are disallowed. However, if
          // only blacklisting of tag properties was applied to these tags,
          // and no whitelisting was ever applied, then it's still fine:
          // since none of the tag properties were blacklisted, we got to
          // this point, and since no whitelisting was applied, it doesn't
          // matter that the properties: this could never have happened
          // anyway. It's only this late that we can know this for certain.

          const tags = Object.keys(universe);
          // Figure out if there was any rule applying whitelisting tag
          // restrictions to each of the remaining tags.
          for (let i = 0; i < tags.length; i++) {
            const tag = tags[i];
            if (universe.hasOwnProperty(tag)) {
              if (universe[tag].touchedByAllowedPropertyRule === false) {
                delete universe[tag];
              }
            }
          }
          return Object.keys(universe).length === 0;
        }
        // Otherwise, if all filter rules were doing blacklisting, then the sole
        // fact that we got to this point indicates that this filter allows for
        // everything that is required for this feature.

        return true;
      }

      // If any filter's current status forbids the editor feature, return
      // false.
      Drupal.filterConfiguration.update();
      return Object.keys(Drupal.filterConfiguration.statuses).every(
        (filterID) =>
          filterStatusAllowsFeature(
            Drupal.filterConfiguration.statuses[filterID],
            feature,
          ),
      );
    },
  };

  /**
   * Constructor for an editor feature HTML rule.
   *
   * Intended to be used in combination with {@link Drupal.EditorFeature}.
   *
   * A text editor feature rule object describes both:
   *  - required HTML tags, attributes, styles and classes: without these, the
   *    text editor feature is unable to function. It's possible that a
   *  - allowed HTML tags, attributes, styles and classes: these are optional
   *    in the strictest sense, but it is possible that the feature generates
   *    them.
   *
   * The structure can be very clearly seen below: there's a "required" and an
   * "allowed" key. For each of those, there are objects with the "tags",
   * "attributes", "styles" and "classes" keys. For all these keys the values
   * are initialized to the empty array. List each possible value as an array
   * value. Besides the "required" and "allowed" keys, there's an optional
   * "raw" key: it allows text editor implementations to optionally pass in
   * their raw representation instead of the Drupal-defined representation for
   * HTML rules.
   *
   * @example
   * tags: ['<a>']
   * attributes: ['href', 'alt']
   * styles: ['color', 'text-decoration']
   * classes: ['external', 'internal']
   *
   * @constructor
   *
   * @see Drupal.EditorFeature
   */
  Drupal.EditorFeatureHTMLRule = function () {
    /**
     *
     * @type {Object}
     *
     * @prop {Array} tags
     * @prop {Array} attributes
     * @prop {Array} styles
     * @prop {Array} classes
     */
    this.required = {
      tags: [],
      attributes: [],
      styles: [],
      classes: [],
    };

    /**
     *
     * @type {Object}
     *
     * @prop {Array} tags
     * @prop {Array} attributes
     * @prop {Array} styles
     * @prop {Array} classes
     */
    this.allowed = {
      tags: [],
      attributes: [],
      styles: [],
      classes: [],
    };

    /**
     *
     * @type {null}
     */
    this.raw = null;
  };

  /**
   * A text editor feature object. Initialized with the feature name.
   *
   * Contains a set of HTML rules ({@link Drupal.EditorFeatureHTMLRule} objects)
   * that describe which HTML tags, attributes, styles and classes are required
   * (i.e. essential for the feature to function at all) and which are allowed
   * (i.e. the feature may generate this, but they're not essential).
   *
   * It is necessary to allow for multiple HTML rules per feature: with just
   * one HTML rule per feature, there is not enough expressiveness to describe
   * certain cases. For example: a "table" feature would probably require the
   * `<table>` tag, and might allow e.g. the "summary" attribute on that tag.
   * However, the table feature would also require the `<tr>` and `<td>` tags,
   * but it doesn't make sense to allow for a "summary" attribute on these tags.
   * Hence these would need to be split in two separate rules.
   *
   * HTML rules must be added with the `addHTMLRule()` method. A feature that
   * has zero HTML rules does not create or modify HTML.
   *
   * @constructor
   *
   * @param {string} name
   *   The name of the feature.
   *
   * @see Drupal.EditorFeatureHTMLRule
   */
  Drupal.EditorFeature = function (name) {
    this.name = name;
    this.rules = [];
  };

  /**
   * Adds an HTML rule to the list of HTML rules for this feature.
   *
   * @param {Drupal.EditorFeatureHTMLRule} rule
   *   A text editor feature HTML rule.
   */
  Drupal.EditorFeature.prototype.addHTMLRule = function (rule) {
    this.rules.push(rule);
  };

  /**
   * Text filter status object. Initialized with the filter ID.
   *
   * Indicates whether the text filter is currently active (enabled) or not.
   *
   * Contains a set of HTML rules ({@link Drupal.FilterHTMLRule} objects) that
   * describe which HTML tags are allowed or forbidden. They can also describe
   * for a set of tags (or all tags) which attributes, styles and classes are
   * allowed and which are forbidden.
   *
   * It is necessary to allow for multiple HTML rules per feature, for
   * analogous reasons as {@link Drupal.EditorFeature}.
   *
   * HTML rules must be added with the `addHTMLRule()` method. A filter that has
   * zero HTML rules does not disallow any HTML.
   *
   * @constructor
   *
   * @param {string} name
   *   The name of the feature.
   *
   * @see Drupal.FilterHTMLRule
   */
  Drupal.FilterStatus = function (name) {
    /**
     *
     * @type {string}
     */
    this.name = name;

    /**
     *
     * @type {boolean}
     */
    this.active = false;

    /**
     *
     * @type {Array.<Drupal.FilterHTMLRule>}
     */
    this.rules = [];
  };

  /**
   * Adds an HTML rule to the list of HTML rules for this filter.
   *
   * @param {Drupal.FilterHTMLRule} rule
   *   A text filter HTML rule.
   */
  Drupal.FilterStatus.prototype.addHTMLRule = function (rule) {
    this.rules.push(rule);
  };

  /**
   * A text filter HTML rule object.
   *
   * Intended to be used in combination with {@link Drupal.FilterStatus}.
   *
   * A text filter rule object describes:
   *  1. allowed or forbidden tags: (optional) whitelist or blacklist HTML tags
   *  2. restricted tag properties: (optional) whitelist or blacklist
   *     attributes, styles and classes on a set of HTML tags.
   *
   * Typically, each text filter rule object does either 1 or 2, not both.
   *
   * The structure can be very clearly seen below:
   *  1. use the "tags" key to list HTML tags, and set the "allow" key to
   *     either true (to allow these HTML tags) or false (to forbid these HTML
   *     tags). If you leave the "tags" key's default value (the empty array),
   *     no restrictions are applied.
   *  2. all nested within the "restrictedTags" key: use the "tags" subkey to
   *     list HTML tags to which you want to apply property restrictions, then
   *     use the "allowed" subkey to whitelist specific property values, and
   *     similarly use the "forbidden" subkey to blacklist specific property
   *     values.
   *
   * @example
   * <caption>Whitelist the "p", "strong" and "a" HTML tags.</caption>
   * {
   *   tags: ['p', 'strong', 'a'],
   *   allow: true,
   *   restrictedTags: {
   *     tags: [],
   *     allowed: { attributes: [], styles: [], classes: [] },
   *     forbidden: { attributes: [], styles: [], classes: [] }
   *   }
   * }
   * @example
   * <caption>For the "a" HTML tag, only allow the "href" attribute
   * and the "external" class and disallow the "target" attribute.</caption>
   * {
   *   tags: [],
   *   allow: null,
   *   restrictedTags: {
   *     tags: ['a'],
   *     allowed: { attributes: ['href'], styles: [], classes: ['external'] },
   *     forbidden: { attributes: ['target'], styles: [], classes: [] }
   *   }
   * }
   * @example
   * <caption>For all tags, allow the "data-*" attribute (that is, any
   * attribute that begins with "data-").</caption>
   * {
   *   tags: [],
   *   allow: null,
   *   restrictedTags: {
   *     tags: ['*'],
   *     allowed: { attributes: ['data-*'], styles: [], classes: [] },
   *     forbidden: { attributes: [], styles: [], classes: [] }
   *   }
   * }
   *
   * @return {object}
   *   An object with the following structure:
   * ```
   * {
   *   tags: Array,
   *   allow: null,
   *   restrictedTags: {
   *     tags: Array,
   *     allowed: {attributes: Array, styles: Array, classes: Array},
   *     forbidden: {attributes: Array, styles: Array, classes: Array}
   *   }
   * }
   * ```
   *
   * @see Drupal.FilterStatus
   */
  Drupal.FilterHTMLRule = function () {
    // Allow or forbid tags.
    this.tags = [];
    this.allow = null;

    // Apply restrictions to properties set on tags.
    this.restrictedTags = {
      tags: [],
      allowed: { attributes: [], styles: [], classes: [] },
      forbidden: { attributes: [], styles: [], classes: [] },
    };

    return this;
  };

  Drupal.FilterHTMLRule.prototype.clone = function () {
    const clone = new Drupal.FilterHTMLRule();
    clone.tags = this.tags.slice(0);
    clone.allow = this.allow;
    clone.restrictedTags.tags = this.restrictedTags.tags.slice(0);
    clone.restrictedTags.allowed.attributes =
      this.restrictedTags.allowed.attributes.slice(0);
    clone.restrictedTags.allowed.styles =
      this.restrictedTags.allowed.styles.slice(0);
    clone.restrictedTags.allowed.classes =
      this.restrictedTags.allowed.classes.slice(0);
    clone.restrictedTags.forbidden.attributes =
      this.restrictedTags.forbidden.attributes.slice(0);
    clone.restrictedTags.forbidden.styles =
      this.restrictedTags.forbidden.styles.slice(0);
    clone.restrictedTags.forbidden.classes =
      this.restrictedTags.forbidden.classes.slice(0);
    return clone;
  };

  /**
   * Tracks the configuration of all text filters in {@link Drupal.FilterStatus}
   * objects for {@link Drupal.editorConfiguration.featureIsAllowedByFilters}.
   *
   * @namespace
   */
  Drupal.filterConfiguration = {
    /**
     * Drupal.FilterStatus objects, keyed by filter ID.
     *
     * @type {Object.<string, Drupal.FilterStatus>}
     */
    statuses: {},

    /**
     * Live filter setting parsers.
     *
     * Object keyed by filter ID, for those filters that implement it.
     *
     * Filters should load the implementing JavaScript on the filter
     * configuration form and implement
     * `Drupal.filterSettings[filterID].getRules()`, which should return an
     * array of {@link Drupal.FilterHTMLRule} objects.
     *
     * @namespace
     */
    liveSettingParsers: {},

    /**
     * Updates all {@link Drupal.FilterStatus} objects to reflect current state.
     *
     * Automatically checks whether a filter is currently enabled or not. To
     * support more fine-grained.
     *
     * If a filter implements a live setting parser, then that will be used to
     * keep the HTML rules for the {@link Drupal.FilterStatus} object
     * up-to-date.
     */
    update() {
      Object.keys(Drupal.filterConfiguration.statuses || {}).forEach(
        (filterID) => {
          // Update status.
          Drupal.filterConfiguration.statuses[filterID].active = $(
            `[name="filters[${filterID}][status]"]`,
          ).is(':checked');

          // Update current rules.
          if (Drupal.filterConfiguration.liveSettingParsers[filterID]) {
            Drupal.filterConfiguration.statuses[filterID].rules =
              Drupal.filterConfiguration.liveSettingParsers[
                filterID
              ].getRules();
          }
        },
      );
    },
  };

  /**
   * Initializes {@link Drupal.filterConfiguration}.
   *
   * @type {Drupal~behavior}
   *
   * @prop {Drupal~behaviorAttach} attach
   *   Gets filter configuration from filter form input.
   */
  Drupal.behaviors.initializeFilterConfiguration = {
    attach(context, settings) {
      once(
        'filter-editor-status',
        '#filters-status-wrapper input.form-checkbox',
        context,
      ).forEach((checkbox) => {
        const $checkbox = $(checkbox);
        const nameAttribute = $checkbox.attr('name');

        // The filter's checkbox has a name attribute of the form
        // "filters[<name of filter>][status]", parse "<name of filter>" from
        // it.
        const filterID = nameAttribute.substring(8, nameAttribute.indexOf(']'));

        // Create a Drupal.FilterStatus object to track the state (whether it's
        // active or not and its current settings, if any) of each filter.
        Drupal.filterConfiguration.statuses[filterID] = new Drupal.FilterStatus(
          filterID,
        );
      });
    },
  };
})(jQuery, Drupal, document);
;
/**
 * @file
 * Drupal's states library.
 */

(function ($, Drupal) {
  /**
   * The base States namespace.
   *
   * Having the local states variable allows us to use the States namespace
   * without having to always declare "Drupal.states".
   *
   * @namespace Drupal.states
   */
  const states = {
    /**
     * An array of functions that should be postponed.
     */
    postponed: [],
  };

  Drupal.states = states;

  /**
   * Inverts a (if it's not undefined) when invertState is true.
   *
   * @function Drupal.states~invert
   *
   * @param {*} a
   *   The value to maybe invert.
   * @param {boolean} invertState
   *   Whether to invert state or not.
   *
   * @return {boolean}
   *   The result.
   */
  function invert(a, invertState) {
    return invertState && typeof a !== 'undefined' ? !a : a;
  }

  /**
   * Compares two values while ignoring undefined values.
   *
   * @function Drupal.states~compare
   *
   * @param {*} a
   *   Value a.
   * @param {*} b
   *   Value b.
   *
   * @return {boolean}
   *   The comparison result.
   */
  function compare(a, b) {
    if (a === b) {
      return typeof a === 'undefined' ? a : true;
    }

    return typeof a === 'undefined' || typeof b === 'undefined';
  }

  /**
   * Bitwise AND with a third undefined state.
   *
   * @function Drupal.states~ternary
   *
   * @param {*} a
   *   Value a.
   * @param {*} b
   *   Value b
   *
   * @return {boolean}
   *   The result.
   */
  function ternary(a, b) {
    if (typeof a === 'undefined') {
      return b;
    }
    if (typeof b === 'undefined') {
      return a;
    }

    return a && b;
  }

  /**
   * Attaches the states.
   *
   * @type {Drupal~behavior}
   *
   * @prop {Drupal~behaviorAttach} attach
   *   Attaches states behaviors.
   */
  Drupal.behaviors.states = {
    attach(context, settings) {
      const $states = $(context).find('[data-drupal-states]');
      const il = $states.length;
      for (let i = 0; i < il; i++) {
        const config = JSON.parse(
          $states[i].getAttribute('data-drupal-states'),
        );
        Object.keys(config || {}).forEach((state) => {
          new states.Dependent({
            element: $($states[i]),
            state: states.State.sanitize(state),
            constraints: config[state],
          });
        });
      }

      // Execute all postponed functions now.
      while (states.postponed.length) {
        states.postponed.shift()();
      }
    },
  };

  /**
   * Object representing an element that depends on other elements.
   *
   * @constructor Drupal.states.Dependent
   *
   * @param {object} args
   *   Object with the following keys (all of which are required)
   * @param {jQuery} args.element
   *   A jQuery object of the dependent element
   * @param {Drupal.states.State} args.state
   *   A State object describing the state that is dependent
   * @param {object} args.constraints
   *   An object with dependency specifications. Lists all elements that this
   *   element depends on. It can be nested and can contain
   *   arbitrary AND and OR clauses.
   */
  states.Dependent = function (args) {
    $.extend(this, { values: {}, oldValue: null }, args);

    this.dependees = this.getDependees();
    Object.keys(this.dependees || {}).forEach((selector) => {
      this.initializeDependee(selector, this.dependees[selector]);
    });
  };

  /**
   * Comparison functions for comparing the value of an element with the
   * specification from the dependency settings. If the object type can't be
   * found in this list, the === operator is used by default.
   *
   * @name Drupal.states.Dependent.comparisons
   *
   * @prop {function} RegExp
   * @prop {function} Function
   * @prop {function} Number
   */
  states.Dependent.comparisons = {
    RegExp(reference, value) {
      return reference.test(value);
    },
    Function(reference, value) {
      // The "reference" variable is a comparison function.
      return reference(value);
    },
    Number(reference, value) {
      // If "reference" is a number and "value" is a string, then cast
      // reference as a string before applying the strict comparison in
      // compare().
      // Otherwise numeric keys in the form's #states array fail to match
      // string values returned from jQuery's val().
      return typeof value === 'string'
        ? compare(reference.toString(), value)
        : compare(reference, value);
    },
  };

  states.Dependent.prototype = {
    /**
     * Initializes one of the elements this dependent depends on.
     *
     * @memberof Drupal.states.Dependent#
     *
     * @param {string} selector
     *   The CSS selector describing the dependee.
     * @param {object} dependeeStates
     *   The list of states that have to be monitored for tracking the
     *   dependee's compliance status.
     */
    initializeDependee(selector, dependeeStates) {
      // Cache for the states of this dependee.
      this.values[selector] = {};

      Object.keys(dependeeStates).forEach((i) => {
        let state = dependeeStates[i];
        // Make sure we're not initializing this selector/state combination
        // twice.
        if ($.inArray(state, dependeeStates) === -1) {
          return;
        }

        state = states.State.sanitize(state);

        // Initialize the value of this state.
        this.values[selector][state.name] = null;

        // Monitor state changes of the specified state for this dependee.
        $(selector).on(`state:${state}`, { selector, state }, (e) => {
          this.update(e.data.selector, e.data.state, e.value);
        });

        // Make sure the event we just bound ourselves to is actually fired.
        new states.Trigger({ selector, state });
      });
    },

    /**
     * Compares a value with a reference value.
     *
     * @memberof Drupal.states.Dependent#
     *
     * @param {object} reference
     *   The value used for reference.
     * @param {string} selector
     *   CSS selector describing the dependee.
     * @param {Drupal.states.State} state
     *   A State object describing the dependee's updated state.
     *
     * @return {boolean}
     *   true or false.
     */
    compare(reference, selector, state) {
      const value = this.values[selector][state.name];
      if (reference.constructor.name in states.Dependent.comparisons) {
        // Use a custom compare function for certain reference value types.
        return states.Dependent.comparisons[reference.constructor.name](
          reference,
          value,
        );
      }

      // Do a plain comparison otherwise.
      return compare(reference, value);
    },

    /**
     * Update the value of a dependee's state.
     *
     * @memberof Drupal.states.Dependent#
     *
     * @param {string} selector
     *   CSS selector describing the dependee.
     * @param {Drupal.states.state} state
     *   A State object describing the dependee's updated state.
     * @param {string} value
     *   The new value for the dependee's updated state.
     */
    update(selector, state, value) {
      // Only act when the 'new' value is actually new.
      if (value !== this.values[selector][state.name]) {
        this.values[selector][state.name] = value;
        this.reevaluate();
      }
    },

    /**
     * Triggers change events in case a state changed.
     *
     * @memberof Drupal.states.Dependent#
     */
    reevaluate() {
      // Check whether any constraint for this dependent state is satisfied.
      let value = this.verifyConstraints(this.constraints);

      // Only invoke a state change event when the value actually changed.
      if (value !== this.oldValue) {
        // Store the new value so that we can compare later whether the value
        // actually changed.
        this.oldValue = value;

        // Normalize the value to match the normalized state name.
        value = invert(value, this.state.invert);

        // By adding "trigger: true", we ensure that state changes don't go into
        // infinite loops.
        this.element.trigger({
          type: `state:${this.state}`,
          value,
          trigger: true,
        });
      }
    },

    /**
     * Evaluates child constraints to determine if a constraint is satisfied.
     *
     * @memberof Drupal.states.Dependent#
     *
     * @param {object|Array} constraints
     *   A constraint object or an array of constraints.
     * @param {string} selector
     *   The selector for these constraints. If undefined, there isn't yet a
     *   selector that these constraints apply to. In that case, the keys of the
     *   object are interpreted as the selector if encountered.
     *
     * @return {boolean}
     *   true or false, depending on whether these constraints are satisfied.
     */
    verifyConstraints(constraints, selector) {
      let result;
      if ($.isArray(constraints)) {
        // This constraint is an array (OR or XOR).
        const hasXor = $.inArray('xor', constraints) === -1;
        const len = constraints.length;
        for (let i = 0; i < len; i++) {
          if (constraints[i] !== 'xor') {
            const constraint = this.checkConstraints(
              constraints[i],
              selector,
              i,
            );
            // Return if this is OR and we have a satisfied constraint or if
            // this is XOR and we have a second satisfied constraint.
            if (constraint && (hasXor || result)) {
              return hasXor;
            }
            result = result || constraint;
          }
        }
      }
      // Make sure we don't try to iterate over things other than objects. This
      // shouldn't normally occur, but in case the condition definition is
      // bogus, we don't want to end up with an infinite loop.
      else if ($.isPlainObject(constraints)) {
        // This constraint is an object (AND).
        // eslint-disable-next-line no-restricted-syntax
        for (const n in constraints) {
          if (constraints.hasOwnProperty(n)) {
            result = ternary(
              result,
              this.checkConstraints(constraints[n], selector, n),
            );
            // False and anything else will evaluate to false, so return when
            // any false condition is found.
            if (result === false) {
              return false;
            }
          }
        }
      }
      return result;
    },

    /**
     * Checks whether the value matches the requirements for this constraint.
     *
     * @memberof Drupal.states.Dependent#
     *
     * @param {string|Array|object} value
     *   Either the value of a state or an array/object of constraints. In the
     *   latter case, resolving the constraint continues.
     * @param {string} [selector]
     *   The selector for this constraint. If undefined, there isn't yet a
     *   selector that this constraint applies to. In that case, the state key
     *   is propagates to a selector and resolving continues.
     * @param {Drupal.states.State} [state]
     *   The state to check for this constraint. If undefined, resolving
     *   continues. If both selector and state aren't undefined and valid
     *   non-numeric strings, a lookup for the actual value of that selector's
     *   state is performed. This parameter is not a State object but a pristine
     *   state string.
     *
     * @return {boolean}
     *   true or false, depending on whether this constraint is satisfied.
     */
    checkConstraints(value, selector, state) {
      // Normalize the last parameter. If it's non-numeric, we treat it either
      // as a selector (in case there isn't one yet) or as a trigger/state.
      if (typeof state !== 'string' || /[0-9]/.test(state[0])) {
        state = null;
      } else if (typeof selector === 'undefined') {
        // Propagate the state to the selector when there isn't one yet.
        selector = state;
        state = null;
      }

      if (state !== null) {
        // Constraints is the actual constraints of an element to check for.
        state = states.State.sanitize(state);
        return invert(this.compare(value, selector, state), state.invert);
      }

      // Resolve this constraint as an AND/OR operator.
      return this.verifyConstraints(value, selector);
    },

    /**
     * Gathers information about all required triggers.
     *
     * @memberof Drupal.states.Dependent#
     *
     * @return {object}
     *   An object describing the required triggers.
     */
    getDependees() {
      const cache = {};
      // Swivel the lookup function so that we can record all available
      // selector- state combinations for initialization.
      const _compare = this.compare;
      this.compare = function (reference, selector, state) {
        (cache[selector] || (cache[selector] = [])).push(state.name);
        // Return nothing (=== undefined) so that the constraint loops are not
        // broken.
      };

      // This call doesn't actually verify anything but uses the resolving
      // mechanism to go through the constraints array, trying to look up each
      // value. Since we swivelled the compare function, this comparison returns
      // undefined and lookup continues until the very end. Instead of lookup up
      // the value, we record that combination of selector and state so that we
      // can initialize all triggers.
      this.verifyConstraints(this.constraints);
      // Restore the original function.
      this.compare = _compare;

      return cache;
    },
  };

  /**
   * @constructor Drupal.states.Trigger
   *
   * @param {object} args
   *   Trigger arguments.
   */
  states.Trigger = function (args) {
    $.extend(this, args);

    if (this.state in states.Trigger.states) {
      this.element = $(this.selector);

      // Only call the trigger initializer when it wasn't yet attached to this
      // element. Otherwise we'd end up with duplicate events.
      if (!this.element.data(`trigger:${this.state}`)) {
        this.initialize();
      }
    }
  };

  states.Trigger.prototype = {
    /**
     * @memberof Drupal.states.Trigger#
     */
    initialize() {
      const trigger = states.Trigger.states[this.state];

      if (typeof trigger === 'function') {
        // We have a custom trigger initialization function.
        trigger.call(window, this.element);
      } else {
        Object.keys(trigger || {}).forEach((event) => {
          this.defaultTrigger(event, trigger[event]);
        });
      }

      // Mark this trigger as initialized for this element.
      this.element.data(`trigger:${this.state}`, true);
    },

    /**
     * @memberof Drupal.states.Trigger#
     *
     * @param {jQuery.Event} event
     *   The event triggered.
     * @param {function} valueFn
     *   The function to call.
     */
    defaultTrigger(event, valueFn) {
      let oldValue = valueFn.call(this.element);

      // Attach the event callback.
      this.element.on(
        event,
        $.proxy(function (e) {
          const value = valueFn.call(this.element, e);
          // Only trigger the event if the value has actually changed.
          if (oldValue !== value) {
            this.element.trigger({
              type: `state:${this.state}`,
              value,
              oldValue,
            });
            oldValue = value;
          }
        }, this),
      );

      states.postponed.push(
        $.proxy(function () {
          // Trigger the event once for initialization purposes.
          this.element.trigger({
            type: `state:${this.state}`,
            value: oldValue,
            oldValue: null,
          });
        }, this),
      );
    },
  };

  /**
   * This list of states contains functions that are used to monitor the state
   * of an element. Whenever an element depends on the state of another element,
   * one of these trigger functions is added to the dependee so that the
   * dependent element can be updated.
   *
   * @name Drupal.states.Trigger.states
   *
   * @prop empty
   * @prop checked
   * @prop value
   * @prop collapsed
   */
  states.Trigger.states = {
    // 'empty' describes the state to be monitored.
    empty: {
      // 'keyup' is the (native DOM) event that we watch for.
      keyup() {
        // The function associated with that trigger returns the new value for
        // the state.
        return this.val() === '';
      },
    },

    checked: {
      change() {
        // prop() and attr() only takes the first element into account. To
        // support selectors matching multiple checkboxes, iterate over all and
        // return whether any is checked.
        let checked = false;
        this.each(function () {
          // Use prop() here as we want a boolean of the checkbox state.
          // @see http://api.jquery.com/prop/
          checked = $(this).prop('checked');
          // Break the each() loop if this is checked.
          return !checked;
        });
        return checked;
      },
    },

    // For radio buttons, only return the value if the radio button is selected.
    value: {
      keyup() {
        // Radio buttons share the same :input[name="key"] selector.
        if (this.length > 1) {
          // Initial checked value of radios is undefined, so we return false.
          return this.filter(':checked').val() || false;
        }
        return this.val();
      },
      change() {
        // Radio buttons share the same :input[name="key"] selector.
        if (this.length > 1) {
          // Initial checked value of radios is undefined, so we return false.
          return this.filter(':checked').val() || false;
        }
        return this.val();
      },
    },

    collapsed: {
      collapsed(e) {
        return typeof e !== 'undefined' && 'value' in e
          ? e.value
          : !this.is('[open]');
      },
    },
  };

  /**
   * A state object is used for describing the state and performing aliasing.
   *
   * @constructor Drupal.states.State
   *
   * @param {string} state
   *   The name of the state.
   */
  states.State = function (state) {
    /**
     * Original unresolved name.
     */
    this.pristine = state;
    this.name = state;

    // Normalize the state name.
    let process = true;
    do {
      // Iteratively remove exclamation marks and invert the value.
      while (this.name.charAt(0) === '!') {
        this.name = this.name.substring(1);
        this.invert = !this.invert;
      }

      // Replace the state with its normalized name.
      if (this.name in states.State.aliases) {
        this.name = states.State.aliases[this.name];
      } else {
        process = false;
      }
    } while (process);
  };

  /**
   * Creates a new State object by sanitizing the passed value.
   *
   * @name Drupal.states.State.sanitize
   *
   * @param {string|Drupal.states.State} state
   *   A state object or the name of a state.
   *
   * @return {Drupal.states.state}
   *   A state object.
   */
  states.State.sanitize = function (state) {
    if (state instanceof states.State) {
      return state;
    }

    return new states.State(state);
  };

  /**
   * This list of aliases is used to normalize states and associates negated
   * names with their respective inverse state.
   *
   * @name Drupal.states.State.aliases
   */
  states.State.aliases = {
    enabled: '!disabled',
    invisible: '!visible',
    invalid: '!valid',
    untouched: '!touched',
    optional: '!required',
    filled: '!empty',
    unchecked: '!checked',
    irrelevant: '!relevant',
    expanded: '!collapsed',
    open: '!collapsed',
    closed: 'collapsed',
    readwrite: '!readonly',
  };

  states.State.prototype = {
    /**
     * @memberof Drupal.states.State#
     */
    invert: false,

    /**
     * Ensures that just using the state object returns the name.
     *
     * @memberof Drupal.states.State#
     *
     * @return {string}
     *   The name of the state.
     */
    toString() {
      return this.name;
    },
  };

  /**
   * Global state change handlers. These are bound to "document" to cover all
   * elements whose state changes. Events sent to elements within the page
   * bubble up to these handlers. We use this system so that themes and modules
   * can override these state change handlers for particular parts of a page.
   */

  const $document = $(document);
  $document.on('state:disabled', (e) => {
    // Only act when this change was triggered by a dependency and not by the
    // element monitoring itself.
    if (e.trigger) {
      $(e.target)
        .prop('disabled', e.value)
        .closest('.js-form-item, .js-form-submit, .js-form-wrapper')
        .toggleClass('form-disabled', e.value)
        .find('select, input, textarea')
        .prop('disabled', e.value);

      // Note: WebKit nightlies don't reflect that change correctly.
      // See https://bugs.webkit.org/show_bug.cgi?id=23789
    }
  });

  $document.on('state:required', (e) => {
    if (e.trigger) {
      if (e.value) {
        const label = `label${e.target.id ? `[for=${e.target.id}]` : ''}`;
        const $label = $(e.target)
          .attr({ required: 'required', 'aria-required': 'true' })
          .closest('.js-form-item, .js-form-wrapper')
          .find(label);
        // Avoids duplicate required markers on initialization.
        if (!$label.hasClass('js-form-required').length) {
          $label.addClass('js-form-required form-required');
        }
      } else {
        $(e.target)
          .removeAttr('required aria-required')
          .closest('.js-form-item, .js-form-wrapper')
          .find('label.js-form-required')
          .removeClass('js-form-required form-required');
      }
    }
  });

  $document.on('state:visible', (e) => {
    if (e.trigger) {
      $(e.target)
        .closest('.js-form-item, .js-form-submit, .js-form-wrapper')
        .toggle(e.value);
    }
  });

  $document.on('state:checked', (e) => {
    if (e.trigger) {
      $(e.target).prop('checked', e.value);
    }
  });

  $document.on('state:collapsed', (e) => {
    if (e.trigger) {
      if ($(e.target).is('[open]') === e.value) {
        $(e.target).find('> summary').trigger('click');
      }
    }
  });
})(jQuery, Drupal);
;
/*! Sortable 1.15.0 - MIT | git://github.com/SortableJS/Sortable.git */
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):(t=t||self).Sortable=e()}(this,function(){"use strict";function e(e,t){var n,o=Object.keys(e);return Object.getOwnPropertySymbols&&(n=Object.getOwnPropertySymbols(e),t&&(n=n.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),o.push.apply(o,n)),o}function M(o){for(var t=1;t<arguments.length;t++){var i=null!=arguments[t]?arguments[t]:{};t%2?e(Object(i),!0).forEach(function(t){var e,n;e=o,t=i[n=t],n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t}):Object.getOwnPropertyDescriptors?Object.defineProperties(o,Object.getOwnPropertyDescriptors(i)):e(Object(i)).forEach(function(t){Object.defineProperty(o,t,Object.getOwnPropertyDescriptor(i,t))})}return o}function o(t){return(o="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function a(){return(a=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var n,o=arguments[e];for(n in o)Object.prototype.hasOwnProperty.call(o,n)&&(t[n]=o[n])}return t}).apply(this,arguments)}function i(t,e){if(null==t)return{};var n,o=function(t,e){if(null==t)return{};for(var n,o={},i=Object.keys(t),r=0;r<i.length;r++)n=i[r],0<=e.indexOf(n)||(o[n]=t[n]);return o}(t,e);if(Object.getOwnPropertySymbols)for(var i=Object.getOwnPropertySymbols(t),r=0;r<i.length;r++)n=i[r],0<=e.indexOf(n)||Object.prototype.propertyIsEnumerable.call(t,n)&&(o[n]=t[n]);return o}function r(t){return function(t){if(Array.isArray(t))return l(t)}(t)||function(t){if("undefined"!=typeof Symbol&&null!=t[Symbol.iterator]||null!=t["@@iterator"])return Array.from(t)}(t)||function(t,e){if(t){if("string"==typeof t)return l(t,e);var n=Object.prototype.toString.call(t).slice(8,-1);return"Map"===(n="Object"===n&&t.constructor?t.constructor.name:n)||"Set"===n?Array.from(t):"Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?l(t,e):void 0}}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function l(t,e){(null==e||e>t.length)&&(e=t.length);for(var n=0,o=new Array(e);n<e;n++)o[n]=t[n];return o}function t(t){if("undefined"!=typeof window&&window.navigator)return!!navigator.userAgent.match(t)}var y=t(/(?:Trident.*rv[ :]?11\.|msie|iemobile|Windows Phone)/i),w=t(/Edge/i),s=t(/firefox/i),u=t(/safari/i)&&!t(/chrome/i)&&!t(/android/i),n=t(/iP(ad|od|hone)/i),c=t(/chrome/i)&&t(/android/i),d={capture:!1,passive:!1};function h(t,e,n){t.addEventListener(e,n,!y&&d)}function f(t,e,n){t.removeEventListener(e,n,!y&&d)}function p(t,e){if(e&&(">"===e[0]&&(e=e.substring(1)),t))try{if(t.matches)return t.matches(e);if(t.msMatchesSelector)return t.msMatchesSelector(e);if(t.webkitMatchesSelector)return t.webkitMatchesSelector(e)}catch(t){return}}function N(t,e,n,o){if(t){n=n||document;do{if(null!=e&&(">"!==e[0]||t.parentNode===n)&&p(t,e)||o&&t===n)return t}while(t!==n&&(t=(i=t).host&&i!==document&&i.host.nodeType?i.host:i.parentNode))}var i;return null}var g,m=/\s+/g;function I(t,e,n){var o;t&&e&&(t.classList?t.classList[n?"add":"remove"](e):(o=(" "+t.className+" ").replace(m," ").replace(" "+e+" "," "),t.className=(o+(n?" "+e:"")).replace(m," ")))}function P(t,e,n){var o=t&&t.style;if(o){if(void 0===n)return document.defaultView&&document.defaultView.getComputedStyle?n=document.defaultView.getComputedStyle(t,""):t.currentStyle&&(n=t.currentStyle),void 0===e?n:n[e];o[e=!(e in o||-1!==e.indexOf("webkit"))?"-webkit-"+e:e]=n+("string"==typeof n?"":"px")}}function v(t,e){var n="";if("string"==typeof t)n=t;else do{var o=P(t,"transform")}while(o&&"none"!==o&&(n=o+" "+n),!e&&(t=t.parentNode));var i=window.DOMMatrix||window.WebKitCSSMatrix||window.CSSMatrix||window.MSCSSMatrix;return i&&new i(n)}function b(t,e,n){if(t){var o=t.getElementsByTagName(e),i=0,r=o.length;if(n)for(;i<r;i++)n(o[i],i);return o}return[]}function O(){var t=document.scrollingElement;return t||document.documentElement}function k(t,e,n,o,i){if(t.getBoundingClientRect||t===window){var r,a,l,s,c,u,d=t!==window&&t.parentNode&&t!==O()?(a=(r=t.getBoundingClientRect()).top,l=r.left,s=r.bottom,c=r.right,u=r.height,r.width):(l=a=0,s=window.innerHeight,c=window.innerWidth,u=window.innerHeight,window.innerWidth);if((e||n)&&t!==window&&(i=i||t.parentNode,!y))do{if(i&&i.getBoundingClientRect&&("none"!==P(i,"transform")||n&&"static"!==P(i,"position"))){var h=i.getBoundingClientRect();a-=h.top+parseInt(P(i,"border-top-width")),l-=h.left+parseInt(P(i,"border-left-width")),s=a+r.height,c=l+r.width;break}}while(i=i.parentNode);return o&&t!==window&&(o=(e=v(i||t))&&e.a,t=e&&e.d,e&&(s=(a/=t)+(u/=t),c=(l/=o)+(d/=o))),{top:a,left:l,bottom:s,right:c,width:d,height:u}}}function R(t,e,n){for(var o=A(t,!0),i=k(t)[e];o;){var r=k(o)[n];if(!("top"===n||"left"===n?r<=i:i<=r))return o;if(o===O())break;o=A(o,!1)}return!1}function X(t,e,n,o){for(var i=0,r=0,a=t.children;r<a.length;){if("none"!==a[r].style.display&&a[r]!==Bt.ghost&&(o||a[r]!==Bt.dragged)&&N(a[r],n.draggable,t,!1)){if(i===e)return a[r];i++}r++}return null}function Y(t,e){for(var n=t.lastElementChild;n&&(n===Bt.ghost||"none"===P(n,"display")||e&&!p(n,e));)n=n.previousElementSibling;return n||null}function B(t,e){var n=0;if(!t||!t.parentNode)return-1;for(;t=t.previousElementSibling;)"TEMPLATE"===t.nodeName.toUpperCase()||t===Bt.clone||e&&!p(t,e)||n++;return n}function E(t){var e=0,n=0,o=O();if(t)do{var i=v(t),r=i.a,i=i.d}while(e+=t.scrollLeft*r,n+=t.scrollTop*i,t!==o&&(t=t.parentNode));return[e,n]}function A(t,e){if(!t||!t.getBoundingClientRect)return O();var n=t,o=!1;do{if(n.clientWidth<n.scrollWidth||n.clientHeight<n.scrollHeight){var i=P(n);if(n.clientWidth<n.scrollWidth&&("auto"==i.overflowX||"scroll"==i.overflowX)||n.clientHeight<n.scrollHeight&&("auto"==i.overflowY||"scroll"==i.overflowY)){if(!n.getBoundingClientRect||n===document.body)return O();if(o||e)return n;o=!0}}}while(n=n.parentNode);return O()}function D(t,e){return Math.round(t.top)===Math.round(e.top)&&Math.round(t.left)===Math.round(e.left)&&Math.round(t.height)===Math.round(e.height)&&Math.round(t.width)===Math.round(e.width)}function S(e,n){return function(){var t;g||(1===(t=arguments).length?e.call(this,t[0]):e.apply(this,t),g=setTimeout(function(){g=void 0},n))}}function F(t,e,n){t.scrollLeft+=e,t.scrollTop+=n}function _(t){var e=window.Polymer,n=window.jQuery||window.Zepto;return e&&e.dom?e.dom(t).cloneNode(!0):n?n(t).clone(!0)[0]:t.cloneNode(!0)}function C(t,e){P(t,"position","absolute"),P(t,"top",e.top),P(t,"left",e.left),P(t,"width",e.width),P(t,"height",e.height)}function T(t){P(t,"position",""),P(t,"top",""),P(t,"left",""),P(t,"width",""),P(t,"height","")}var j="Sortable"+(new Date).getTime();function x(){var e,o=[];return{captureAnimationState:function(){o=[],this.options.animation&&[].slice.call(this.el.children).forEach(function(t){var e,n;"none"!==P(t,"display")&&t!==Bt.ghost&&(o.push({target:t,rect:k(t)}),e=M({},o[o.length-1].rect),!t.thisAnimationDuration||(n=v(t,!0))&&(e.top-=n.f,e.left-=n.e),t.fromRect=e)})},addAnimationState:function(t){o.push(t)},removeAnimationState:function(t){o.splice(function(t,e){for(var n in t)if(t.hasOwnProperty(n))for(var o in e)if(e.hasOwnProperty(o)&&e[o]===t[n][o])return Number(n);return-1}(o,{target:t}),1)},animateAll:function(t){var c=this;if(!this.options.animation)return clearTimeout(e),void("function"==typeof t&&t());var u=!1,d=0;o.forEach(function(t){var e=0,n=t.target,o=n.fromRect,i=k(n),r=n.prevFromRect,a=n.prevToRect,l=t.rect,s=v(n,!0);s&&(i.top-=s.f,i.left-=s.e),n.toRect=i,n.thisAnimationDuration&&D(r,i)&&!D(o,i)&&(l.top-i.top)/(l.left-i.left)==(o.top-i.top)/(o.left-i.left)&&(t=l,s=r,r=a,a=c.options,e=Math.sqrt(Math.pow(s.top-t.top,2)+Math.pow(s.left-t.left,2))/Math.sqrt(Math.pow(s.top-r.top,2)+Math.pow(s.left-r.left,2))*a.animation),D(i,o)||(n.prevFromRect=o,n.prevToRect=i,e=e||c.options.animation,c.animate(n,l,i,e)),e&&(u=!0,d=Math.max(d,e),clearTimeout(n.animationResetTimer),n.animationResetTimer=setTimeout(function(){n.animationTime=0,n.prevFromRect=null,n.fromRect=null,n.prevToRect=null,n.thisAnimationDuration=null},e),n.thisAnimationDuration=e)}),clearTimeout(e),u?e=setTimeout(function(){"function"==typeof t&&t()},d):"function"==typeof t&&t(),o=[]},animate:function(t,e,n,o){var i,r;o&&(P(t,"transition",""),P(t,"transform",""),i=(r=v(this.el))&&r.a,r=r&&r.d,i=(e.left-n.left)/(i||1),r=(e.top-n.top)/(r||1),t.animatingX=!!i,t.animatingY=!!r,P(t,"transform","translate3d("+i+"px,"+r+"px,0)"),this.forRepaintDummy=t.offsetWidth,P(t,"transition","transform "+o+"ms"+(this.options.easing?" "+this.options.easing:"")),P(t,"transform","translate3d(0,0,0)"),"number"==typeof t.animated&&clearTimeout(t.animated),t.animated=setTimeout(function(){P(t,"transition",""),P(t,"transform",""),t.animated=!1,t.animatingX=!1,t.animatingY=!1},o))}}}var H=[],L={initializeByDefault:!0},K={mount:function(e){for(var t in L)!L.hasOwnProperty(t)||t in e||(e[t]=L[t]);H.forEach(function(t){if(t.pluginName===e.pluginName)throw"Sortable: Cannot mount plugin ".concat(e.pluginName," more than once")}),H.push(e)},pluginEvent:function(e,n,o){var t=this;this.eventCanceled=!1,o.cancel=function(){t.eventCanceled=!0};var i=e+"Global";H.forEach(function(t){n[t.pluginName]&&(n[t.pluginName][i]&&n[t.pluginName][i](M({sortable:n},o)),n.options[t.pluginName]&&n[t.pluginName][e]&&n[t.pluginName][e](M({sortable:n},o)))})},initializePlugins:function(n,o,i,t){for(var e in H.forEach(function(t){var e=t.pluginName;(n.options[e]||t.initializeByDefault)&&((t=new t(n,o,n.options)).sortable=n,t.options=n.options,n[e]=t,a(i,t.defaults))}),n.options){var r;n.options.hasOwnProperty(e)&&(void 0!==(r=this.modifyOption(n,e,n.options[e]))&&(n.options[e]=r))}},getEventProperties:function(e,n){var o={};return H.forEach(function(t){"function"==typeof t.eventProperties&&a(o,t.eventProperties.call(n[t.pluginName],e))}),o},modifyOption:function(e,n,o){var i;return H.forEach(function(t){e[t.pluginName]&&t.optionListeners&&"function"==typeof t.optionListeners[n]&&(i=t.optionListeners[n].call(e[t.pluginName],o))}),i}};function W(t){var e=t.sortable,n=t.rootEl,o=t.name,i=t.targetEl,r=t.cloneEl,a=t.toEl,l=t.fromEl,s=t.oldIndex,c=t.newIndex,u=t.oldDraggableIndex,d=t.newDraggableIndex,h=t.originalEvent,f=t.putSortable,p=t.extraEventProperties;if(e=e||n&&n[j]){var g,m=e.options,t="on"+o.charAt(0).toUpperCase()+o.substr(1);!window.CustomEvent||y||w?(g=document.createEvent("Event")).initEvent(o,!0,!0):g=new CustomEvent(o,{bubbles:!0,cancelable:!0}),g.to=a||n,g.from=l||n,g.item=i||n,g.clone=r,g.oldIndex=s,g.newIndex=c,g.oldDraggableIndex=u,g.newDraggableIndex=d,g.originalEvent=h,g.pullMode=f?f.lastPutMode:void 0;var v,b=M(M({},p),K.getEventProperties(o,e));for(v in b)g[v]=b[v];n&&n.dispatchEvent(g),m[t]&&m[t].call(e,g)}}function z(t,e){var n=(o=2<arguments.length&&void 0!==arguments[2]?arguments[2]:{}).evt,o=i(o,G);K.pluginEvent.bind(Bt)(t,e,M({dragEl:q,parentEl:V,ghostEl:Z,rootEl:$,nextEl:Q,lastDownEl:J,cloneEl:tt,cloneHidden:et,dragStarted:pt,putSortable:lt,activeSortable:Bt.active,originalEvent:n,oldIndex:nt,oldDraggableIndex:it,newIndex:ot,newDraggableIndex:rt,hideGhostForTarget:kt,unhideGhostForTarget:Rt,cloneNowHidden:function(){et=!0},cloneNowShown:function(){et=!1},dispatchSortableEvent:function(t){U({sortable:e,name:t,originalEvent:n})}},o))}var G=["evt"];function U(t){W(M({putSortable:lt,cloneEl:tt,targetEl:q,rootEl:$,oldIndex:nt,oldDraggableIndex:it,newIndex:ot,newDraggableIndex:rt},t))}var q,V,Z,$,Q,J,tt,et,nt,ot,it,rt,at,lt,st,ct,ut,dt,ht,ft,pt,gt,mt,vt,bt,yt=!1,wt=!1,Et=[],Dt=!1,St=!1,_t=[],Ct=!1,Tt=[],xt="undefined"!=typeof document,Ot=n,At=w||y?"cssFloat":"float",Mt=xt&&!c&&!n&&"draggable"in document.createElement("div"),Nt=function(){if(xt){if(y)return!1;var t=document.createElement("x");return t.style.cssText="pointer-events:auto","auto"===t.style.pointerEvents}}(),It=function(t,e){var n=P(t),o=parseInt(n.width)-parseInt(n.paddingLeft)-parseInt(n.paddingRight)-parseInt(n.borderLeftWidth)-parseInt(n.borderRightWidth),i=X(t,0,e),r=X(t,1,e),a=i&&P(i),l=r&&P(r),s=a&&parseInt(a.marginLeft)+parseInt(a.marginRight)+k(i).width,t=l&&parseInt(l.marginLeft)+parseInt(l.marginRight)+k(r).width;if("flex"===n.display)return"column"===n.flexDirection||"column-reverse"===n.flexDirection?"vertical":"horizontal";if("grid"===n.display)return n.gridTemplateColumns.split(" ").length<=1?"vertical":"horizontal";if(i&&a.float&&"none"!==a.float){e="left"===a.float?"left":"right";return!r||"both"!==l.clear&&l.clear!==e?"horizontal":"vertical"}return i&&("block"===a.display||"flex"===a.display||"table"===a.display||"grid"===a.display||o<=s&&"none"===n[At]||r&&"none"===n[At]&&o<s+t)?"vertical":"horizontal"},Pt=function(t){function l(r,a){return function(t,e,n,o){var i=t.options.group.name&&e.options.group.name&&t.options.group.name===e.options.group.name;if(null==r&&(a||i))return!0;if(null==r||!1===r)return!1;if(a&&"clone"===r)return r;if("function"==typeof r)return l(r(t,e,n,o),a)(t,e,n,o);e=(a?t:e).options.group.name;return!0===r||"string"==typeof r&&r===e||r.join&&-1<r.indexOf(e)}}var e={},n=t.group;n&&"object"==o(n)||(n={name:n}),e.name=n.name,e.checkPull=l(n.pull,!0),e.checkPut=l(n.put),e.revertClone=n.revertClone,t.group=e},kt=function(){!Nt&&Z&&P(Z,"display","none")},Rt=function(){!Nt&&Z&&P(Z,"display","")};xt&&!c&&document.addEventListener("click",function(t){if(wt)return t.preventDefault(),t.stopPropagation&&t.stopPropagation(),t.stopImmediatePropagation&&t.stopImmediatePropagation(),wt=!1},!0);function Xt(t){if(q){t=t.touches?t.touches[0]:t;var e=(i=t.clientX,r=t.clientY,Et.some(function(t){var e=t[j].options.emptyInsertThreshold;if(e&&!Y(t)){var n=k(t),o=i>=n.left-e&&i<=n.right+e,e=r>=n.top-e&&r<=n.bottom+e;return o&&e?a=t:void 0}}),a);if(e){var n,o={};for(n in t)t.hasOwnProperty(n)&&(o[n]=t[n]);o.target=o.rootEl=e,o.preventDefault=void 0,o.stopPropagation=void 0,e[j]._onDragOver(o)}}var i,r,a}function Yt(t){q&&q.parentNode[j]._isOutsideThisEl(t.target)}function Bt(t,e){if(!t||!t.nodeType||1!==t.nodeType)throw"Sortable: `el` must be an HTMLElement, not ".concat({}.toString.call(t));this.el=t,this.options=e=a({},e),t[j]=this;var n,o,i={group:null,sort:!0,disabled:!1,store:null,handle:null,draggable:/^[uo]l$/i.test(t.nodeName)?">li":">*",swapThreshold:1,invertSwap:!1,invertedSwapThreshold:null,removeCloneOnHide:!0,direction:function(){return It(t,this.options)},ghostClass:"sortable-ghost",chosenClass:"sortable-chosen",dragClass:"sortable-drag",ignore:"a, img",filter:null,preventOnFilter:!0,animation:0,easing:null,setData:function(t,e){t.setData("Text",e.textContent)},dropBubble:!1,dragoverBubble:!1,dataIdAttr:"data-id",delay:0,delayOnTouchOnly:!1,touchStartThreshold:(Number.parseInt?Number:window).parseInt(window.devicePixelRatio,10)||1,forceFallback:!1,fallbackClass:"sortable-fallback",fallbackOnBody:!1,fallbackTolerance:0,fallbackOffset:{x:0,y:0},supportPointer:!1!==Bt.supportPointer&&"PointerEvent"in window&&!u,emptyInsertThreshold:5};for(n in K.initializePlugins(this,t,i),i)n in e||(e[n]=i[n]);for(o in Pt(e),this)"_"===o.charAt(0)&&"function"==typeof this[o]&&(this[o]=this[o].bind(this));this.nativeDraggable=!e.forceFallback&&Mt,this.nativeDraggable&&(this.options.touchStartThreshold=1),e.supportPointer?h(t,"pointerdown",this._onTapStart):(h(t,"mousedown",this._onTapStart),h(t,"touchstart",this._onTapStart)),this.nativeDraggable&&(h(t,"dragover",this),h(t,"dragenter",this)),Et.push(this.el),e.store&&e.store.get&&this.sort(e.store.get(this)||[]),a(this,x())}function Ft(t,e,n,o,i,r,a,l){var s,c,u=t[j],d=u.options.onMove;return!window.CustomEvent||y||w?(s=document.createEvent("Event")).initEvent("move",!0,!0):s=new CustomEvent("move",{bubbles:!0,cancelable:!0}),s.to=e,s.from=t,s.dragged=n,s.draggedRect=o,s.related=i||e,s.relatedRect=r||k(e),s.willInsertAfter=l,s.originalEvent=a,t.dispatchEvent(s),c=d?d.call(u,s,a):c}function jt(t){t.draggable=!1}function Ht(){Ct=!1}function Lt(t){return setTimeout(t,0)}function Kt(t){return clearTimeout(t)}Bt.prototype={constructor:Bt,_isOutsideThisEl:function(t){this.el.contains(t)||t===this.el||(gt=null)},_getDirection:function(t,e){return"function"==typeof this.options.direction?this.options.direction.call(this,t,e,q):this.options.direction},_onTapStart:function(e){if(e.cancelable){var n=this,o=this.el,t=this.options,i=t.preventOnFilter,r=e.type,a=e.touches&&e.touches[0]||e.pointerType&&"touch"===e.pointerType&&e,l=(a||e).target,s=e.target.shadowRoot&&(e.path&&e.path[0]||e.composedPath&&e.composedPath()[0])||l,c=t.filter;if(!function(t){Tt.length=0;var e=t.getElementsByTagName("input"),n=e.length;for(;n--;){var o=e[n];o.checked&&Tt.push(o)}}(o),!q&&!(/mousedown|pointerdown/.test(r)&&0!==e.button||t.disabled)&&!s.isContentEditable&&(this.nativeDraggable||!u||!l||"SELECT"!==l.tagName.toUpperCase())&&!((l=N(l,t.draggable,o,!1))&&l.animated||J===l)){if(nt=B(l),it=B(l,t.draggable),"function"==typeof c){if(c.call(this,e,l,this))return U({sortable:n,rootEl:s,name:"filter",targetEl:l,toEl:o,fromEl:o}),z("filter",n,{evt:e}),void(i&&e.cancelable&&e.preventDefault())}else if(c=c&&c.split(",").some(function(t){if(t=N(s,t.trim(),o,!1))return U({sortable:n,rootEl:t,name:"filter",targetEl:l,fromEl:o,toEl:o}),z("filter",n,{evt:e}),!0}))return void(i&&e.cancelable&&e.preventDefault());t.handle&&!N(s,t.handle,o,!1)||this._prepareDragStart(e,a,l)}}},_prepareDragStart:function(t,e,n){var o,i=this,r=i.el,a=i.options,l=r.ownerDocument;n&&!q&&n.parentNode===r&&(o=k(n),$=r,V=(q=n).parentNode,Q=q.nextSibling,J=n,at=a.group,st={target:Bt.dragged=q,clientX:(e||t).clientX,clientY:(e||t).clientY},ht=st.clientX-o.left,ft=st.clientY-o.top,this._lastX=(e||t).clientX,this._lastY=(e||t).clientY,q.style["will-change"]="all",o=function(){z("delayEnded",i,{evt:t}),Bt.eventCanceled?i._onDrop():(i._disableDelayedDragEvents(),!s&&i.nativeDraggable&&(q.draggable=!0),i._triggerDragStart(t,e),U({sortable:i,name:"choose",originalEvent:t}),I(q,a.chosenClass,!0))},a.ignore.split(",").forEach(function(t){b(q,t.trim(),jt)}),h(l,"dragover",Xt),h(l,"mousemove",Xt),h(l,"touchmove",Xt),h(l,"mouseup",i._onDrop),h(l,"touchend",i._onDrop),h(l,"touchcancel",i._onDrop),s&&this.nativeDraggable&&(this.options.touchStartThreshold=4,q.draggable=!0),z("delayStart",this,{evt:t}),!a.delay||a.delayOnTouchOnly&&!e||this.nativeDraggable&&(w||y)?o():Bt.eventCanceled?this._onDrop():(h(l,"mouseup",i._disableDelayedDrag),h(l,"touchend",i._disableDelayedDrag),h(l,"touchcancel",i._disableDelayedDrag),h(l,"mousemove",i._delayedDragTouchMoveHandler),h(l,"touchmove",i._delayedDragTouchMoveHandler),a.supportPointer&&h(l,"pointermove",i._delayedDragTouchMoveHandler),i._dragStartTimer=setTimeout(o,a.delay)))},_delayedDragTouchMoveHandler:function(t){t=t.touches?t.touches[0]:t;Math.max(Math.abs(t.clientX-this._lastX),Math.abs(t.clientY-this._lastY))>=Math.floor(this.options.touchStartThreshold/(this.nativeDraggable&&window.devicePixelRatio||1))&&this._disableDelayedDrag()},_disableDelayedDrag:function(){q&&jt(q),clearTimeout(this._dragStartTimer),this._disableDelayedDragEvents()},_disableDelayedDragEvents:function(){var t=this.el.ownerDocument;f(t,"mouseup",this._disableDelayedDrag),f(t,"touchend",this._disableDelayedDrag),f(t,"touchcancel",this._disableDelayedDrag),f(t,"mousemove",this._delayedDragTouchMoveHandler),f(t,"touchmove",this._delayedDragTouchMoveHandler),f(t,"pointermove",this._delayedDragTouchMoveHandler)},_triggerDragStart:function(t,e){e=e||"touch"==t.pointerType&&t,!this.nativeDraggable||e?this.options.supportPointer?h(document,"pointermove",this._onTouchMove):h(document,e?"touchmove":"mousemove",this._onTouchMove):(h(q,"dragend",this),h($,"dragstart",this._onDragStart));try{document.selection?Lt(function(){document.selection.empty()}):window.getSelection().removeAllRanges()}catch(t){}},_dragStarted:function(t,e){var n;yt=!1,$&&q?(z("dragStarted",this,{evt:e}),this.nativeDraggable&&h(document,"dragover",Yt),n=this.options,t||I(q,n.dragClass,!1),I(q,n.ghostClass,!0),Bt.active=this,t&&this._appendGhost(),U({sortable:this,name:"start",originalEvent:e})):this._nulling()},_emulateDragOver:function(){if(ct){this._lastX=ct.clientX,this._lastY=ct.clientY,kt();for(var t=document.elementFromPoint(ct.clientX,ct.clientY),e=t;t&&t.shadowRoot&&(t=t.shadowRoot.elementFromPoint(ct.clientX,ct.clientY))!==e;)e=t;if(q.parentNode[j]._isOutsideThisEl(t),e)do{if(e[j])if(e[j]._onDragOver({clientX:ct.clientX,clientY:ct.clientY,target:t,rootEl:e})&&!this.options.dragoverBubble)break}while(e=(t=e).parentNode);Rt()}},_onTouchMove:function(t){if(st){var e=this.options,n=e.fallbackTolerance,o=e.fallbackOffset,i=t.touches?t.touches[0]:t,r=Z&&v(Z,!0),a=Z&&r&&r.a,l=Z&&r&&r.d,e=Ot&&bt&&E(bt),a=(i.clientX-st.clientX+o.x)/(a||1)+(e?e[0]-_t[0]:0)/(a||1),l=(i.clientY-st.clientY+o.y)/(l||1)+(e?e[1]-_t[1]:0)/(l||1);if(!Bt.active&&!yt){if(n&&Math.max(Math.abs(i.clientX-this._lastX),Math.abs(i.clientY-this._lastY))<n)return;this._onDragStart(t,!0)}Z&&(r?(r.e+=a-(ut||0),r.f+=l-(dt||0)):r={a:1,b:0,c:0,d:1,e:a,f:l},r="matrix(".concat(r.a,",").concat(r.b,",").concat(r.c,",").concat(r.d,",").concat(r.e,",").concat(r.f,")"),P(Z,"webkitTransform",r),P(Z,"mozTransform",r),P(Z,"msTransform",r),P(Z,"transform",r),ut=a,dt=l,ct=i),t.cancelable&&t.preventDefault()}},_appendGhost:function(){if(!Z){var t=this.options.fallbackOnBody?document.body:$,e=k(q,!0,Ot,!0,t),n=this.options;if(Ot){for(bt=t;"static"===P(bt,"position")&&"none"===P(bt,"transform")&&bt!==document;)bt=bt.parentNode;bt!==document.body&&bt!==document.documentElement?(bt===document&&(bt=O()),e.top+=bt.scrollTop,e.left+=bt.scrollLeft):bt=O(),_t=E(bt)}I(Z=q.cloneNode(!0),n.ghostClass,!1),I(Z,n.fallbackClass,!0),I(Z,n.dragClass,!0),P(Z,"transition",""),P(Z,"transform",""),P(Z,"box-sizing","border-box"),P(Z,"margin",0),P(Z,"top",e.top),P(Z,"left",e.left),P(Z,"width",e.width),P(Z,"height",e.height),P(Z,"opacity","0.8"),P(Z,"position",Ot?"absolute":"fixed"),P(Z,"zIndex","100000"),P(Z,"pointerEvents","none"),Bt.ghost=Z,t.appendChild(Z),P(Z,"transform-origin",ht/parseInt(Z.style.width)*100+"% "+ft/parseInt(Z.style.height)*100+"%")}},_onDragStart:function(t,e){var n=this,o=t.dataTransfer,i=n.options;z("dragStart",this,{evt:t}),Bt.eventCanceled?this._onDrop():(z("setupClone",this),Bt.eventCanceled||((tt=_(q)).removeAttribute("id"),tt.draggable=!1,tt.style["will-change"]="",this._hideClone(),I(tt,this.options.chosenClass,!1),Bt.clone=tt),n.cloneId=Lt(function(){z("clone",n),Bt.eventCanceled||(n.options.removeCloneOnHide||$.insertBefore(tt,q),n._hideClone(),U({sortable:n,name:"clone"}))}),e||I(q,i.dragClass,!0),e?(wt=!0,n._loopId=setInterval(n._emulateDragOver,50)):(f(document,"mouseup",n._onDrop),f(document,"touchend",n._onDrop),f(document,"touchcancel",n._onDrop),o&&(o.effectAllowed="move",i.setData&&i.setData.call(n,o,q)),h(document,"drop",n),P(q,"transform","translateZ(0)")),yt=!0,n._dragStartId=Lt(n._dragStarted.bind(n,e,t)),h(document,"selectstart",n),pt=!0,u&&P(document.body,"user-select","none"))},_onDragOver:function(n){var o,i,r,t,a=this.el,l=n.target,e=this.options,s=e.group,c=Bt.active,u=at===s,d=e.sort,h=lt||c,f=this,p=!1;if(!Ct){if(void 0!==n.preventDefault&&n.cancelable&&n.preventDefault(),l=N(l,e.draggable,a,!0),T("dragOver"),Bt.eventCanceled)return p;if(q.contains(n.target)||l.animated&&l.animatingX&&l.animatingY||f._ignoreWhileAnimating===l)return O(!1);if(wt=!1,c&&!e.disabled&&(u?d||(i=V!==$):lt===this||(this.lastPutMode=at.checkPull(this,c,q,n))&&s.checkPut(this,c,q,n))){if(r="vertical"===this._getDirection(n,l),o=k(q),T("dragOverValid"),Bt.eventCanceled)return p;if(i)return V=$,x(),this._hideClone(),T("revert"),Bt.eventCanceled||(Q?$.insertBefore(q,Q):$.appendChild(q)),O(!0);var g=Y(a,e.draggable);if(!g||function(t,e,n){n=k(Y(n.el,n.options.draggable));return e?t.clientX>n.right+10||t.clientX<=n.right&&t.clientY>n.bottom&&t.clientX>=n.left:t.clientX>n.right&&t.clientY>n.top||t.clientX<=n.right&&t.clientY>n.bottom+10}(n,r,this)&&!g.animated){if(g===q)return O(!1);if((l=g&&a===n.target?g:l)&&(w=k(l)),!1!==Ft($,a,q,o,l,w,n,!!l))return x(),g&&g.nextSibling?a.insertBefore(q,g.nextSibling):a.appendChild(q),V=a,A(),O(!0)}else if(g&&function(t,e,n){n=k(X(n.el,0,n.options,!0));return e?t.clientX<n.left-10||t.clientY<n.top&&t.clientX<n.right:t.clientY<n.top-10||t.clientY<n.bottom&&t.clientX<n.left}(n,r,this)){var m=X(a,0,e,!0);if(m===q)return O(!1);if(w=k(l=m),!1!==Ft($,a,q,o,l,w,n,!1))return x(),a.insertBefore(q,m),V=a,A(),O(!0)}else if(l.parentNode===a){var v,b,y,w=k(l),E=q.parentNode!==a,D=(D=q.animated&&q.toRect||o,C=l.animated&&l.toRect||w,S=(t=r)?D.left:D.top,s=t?D.right:D.bottom,g=t?D.width:D.height,m=t?C.left:C.top,D=t?C.right:C.bottom,C=t?C.width:C.height,!(S===m||s===D||S+g/2===m+C/2)),S=r?"top":"left",g=R(l,"top","top")||R(q,"top","top"),m=g?g.scrollTop:void 0;if(gt!==l&&(b=w[S],Dt=!1,St=!D&&e.invertSwap||E),0!==(v=function(t,e,n,o,i,r,a,l){var s=o?t.clientY:t.clientX,c=o?n.height:n.width,t=o?n.top:n.left,o=o?n.bottom:n.right,n=!1;if(!a)if(l&&vt<c*i){if(Dt=!Dt&&(1===mt?t+c*r/2<s:s<o-c*r/2)?!0:Dt)n=!0;else if(1===mt?s<t+vt:o-vt<s)return-mt}else if(t+c*(1-i)/2<s&&s<o-c*(1-i)/2)return function(t){return B(q)<B(t)?1:-1}(e);if((n=n||a)&&(s<t+c*r/2||o-c*r/2<s))return t+c/2<s?1:-1;return 0}(n,l,w,r,D?1:e.swapThreshold,null==e.invertedSwapThreshold?e.swapThreshold:e.invertedSwapThreshold,St,gt===l)))for(var _=B(q);(y=V.children[_-=v])&&("none"===P(y,"display")||y===Z););if(0===v||y===l)return O(!1);mt=v;var C=(gt=l).nextElementSibling,E=!1,D=Ft($,a,q,o,l,w,n,E=1===v);if(!1!==D)return 1!==D&&-1!==D||(E=1===D),Ct=!0,setTimeout(Ht,30),x(),E&&!C?a.appendChild(q):l.parentNode.insertBefore(q,E?C:l),g&&F(g,0,m-g.scrollTop),V=q.parentNode,void 0===b||St||(vt=Math.abs(b-k(l)[S])),A(),O(!0)}if(a.contains(q))return O(!1)}return!1}function T(t,e){z(t,f,M({evt:n,isOwner:u,axis:r?"vertical":"horizontal",revert:i,dragRect:o,targetRect:w,canSort:d,fromSortable:h,target:l,completed:O,onMove:function(t,e){return Ft($,a,q,o,t,k(t),n,e)},changed:A},e))}function x(){T("dragOverAnimationCapture"),f.captureAnimationState(),f!==h&&h.captureAnimationState()}function O(t){return T("dragOverCompleted",{insertion:t}),t&&(u?c._hideClone():c._showClone(f),f!==h&&(I(q,(lt||c).options.ghostClass,!1),I(q,e.ghostClass,!0)),lt!==f&&f!==Bt.active?lt=f:f===Bt.active&&lt&&(lt=null),h===f&&(f._ignoreWhileAnimating=l),f.animateAll(function(){T("dragOverAnimationComplete"),f._ignoreWhileAnimating=null}),f!==h&&(h.animateAll(),h._ignoreWhileAnimating=null)),(l===q&&!q.animated||l===a&&!l.animated)&&(gt=null),e.dragoverBubble||n.rootEl||l===document||(q.parentNode[j]._isOutsideThisEl(n.target),t||Xt(n)),!e.dragoverBubble&&n.stopPropagation&&n.stopPropagation(),p=!0}function A(){ot=B(q),rt=B(q,e.draggable),U({sortable:f,name:"change",toEl:a,newIndex:ot,newDraggableIndex:rt,originalEvent:n})}},_ignoreWhileAnimating:null,_offMoveEvents:function(){f(document,"mousemove",this._onTouchMove),f(document,"touchmove",this._onTouchMove),f(document,"pointermove",this._onTouchMove),f(document,"dragover",Xt),f(document,"mousemove",Xt),f(document,"touchmove",Xt)},_offUpEvents:function(){var t=this.el.ownerDocument;f(t,"mouseup",this._onDrop),f(t,"touchend",this._onDrop),f(t,"pointerup",this._onDrop),f(t,"touchcancel",this._onDrop),f(document,"selectstart",this)},_onDrop:function(t){var e=this.el,n=this.options;ot=B(q),rt=B(q,n.draggable),z("drop",this,{evt:t}),V=q&&q.parentNode,ot=B(q),rt=B(q,n.draggable),Bt.eventCanceled||(Dt=St=yt=!1,clearInterval(this._loopId),clearTimeout(this._dragStartTimer),Kt(this.cloneId),Kt(this._dragStartId),this.nativeDraggable&&(f(document,"drop",this),f(e,"dragstart",this._onDragStart)),this._offMoveEvents(),this._offUpEvents(),u&&P(document.body,"user-select",""),P(q,"transform",""),t&&(pt&&(t.cancelable&&t.preventDefault(),n.dropBubble||t.stopPropagation()),Z&&Z.parentNode&&Z.parentNode.removeChild(Z),($===V||lt&&"clone"!==lt.lastPutMode)&&tt&&tt.parentNode&&tt.parentNode.removeChild(tt),q&&(this.nativeDraggable&&f(q,"dragend",this),jt(q),q.style["will-change"]="",pt&&!yt&&I(q,(lt||this).options.ghostClass,!1),I(q,this.options.chosenClass,!1),U({sortable:this,name:"unchoose",toEl:V,newIndex:null,newDraggableIndex:null,originalEvent:t}),$!==V?(0<=ot&&(U({rootEl:V,name:"add",toEl:V,fromEl:$,originalEvent:t}),U({sortable:this,name:"remove",toEl:V,originalEvent:t}),U({rootEl:V,name:"sort",toEl:V,fromEl:$,originalEvent:t}),U({sortable:this,name:"sort",toEl:V,originalEvent:t})),lt&&lt.save()):ot!==nt&&0<=ot&&(U({sortable:this,name:"update",toEl:V,originalEvent:t}),U({sortable:this,name:"sort",toEl:V,originalEvent:t})),Bt.active&&(null!=ot&&-1!==ot||(ot=nt,rt=it),U({sortable:this,name:"end",toEl:V,originalEvent:t}),this.save())))),this._nulling()},_nulling:function(){z("nulling",this),$=q=V=Z=Q=tt=J=et=st=ct=pt=ot=rt=nt=it=gt=mt=lt=at=Bt.dragged=Bt.ghost=Bt.clone=Bt.active=null,Tt.forEach(function(t){t.checked=!0}),Tt.length=ut=dt=0},handleEvent:function(t){switch(t.type){case"drop":case"dragend":this._onDrop(t);break;case"dragenter":case"dragover":q&&(this._onDragOver(t),function(t){t.dataTransfer&&(t.dataTransfer.dropEffect="move");t.cancelable&&t.preventDefault()}(t));break;case"selectstart":t.preventDefault()}},toArray:function(){for(var t,e=[],n=this.el.children,o=0,i=n.length,r=this.options;o<i;o++)N(t=n[o],r.draggable,this.el,!1)&&e.push(t.getAttribute(r.dataIdAttr)||function(t){var e=t.tagName+t.className+t.src+t.href+t.textContent,n=e.length,o=0;for(;n--;)o+=e.charCodeAt(n);return o.toString(36)}(t));return e},sort:function(t,e){var n={},o=this.el;this.toArray().forEach(function(t,e){e=o.children[e];N(e,this.options.draggable,o,!1)&&(n[t]=e)},this),e&&this.captureAnimationState(),t.forEach(function(t){n[t]&&(o.removeChild(n[t]),o.appendChild(n[t]))}),e&&this.animateAll()},save:function(){var t=this.options.store;t&&t.set&&t.set(this)},closest:function(t,e){return N(t,e||this.options.draggable,this.el,!1)},option:function(t,e){var n=this.options;if(void 0===e)return n[t];var o=K.modifyOption(this,t,e);n[t]=void 0!==o?o:e,"group"===t&&Pt(n)},destroy:function(){z("destroy",this);var t=this.el;t[j]=null,f(t,"mousedown",this._onTapStart),f(t,"touchstart",this._onTapStart),f(t,"pointerdown",this._onTapStart),this.nativeDraggable&&(f(t,"dragover",this),f(t,"dragenter",this)),Array.prototype.forEach.call(t.querySelectorAll("[draggable]"),function(t){t.removeAttribute("draggable")}),this._onDrop(),this._disableDelayedDragEvents(),Et.splice(Et.indexOf(this.el),1),this.el=t=null},_hideClone:function(){et||(z("hideClone",this),Bt.eventCanceled||(P(tt,"display","none"),this.options.removeCloneOnHide&&tt.parentNode&&tt.parentNode.removeChild(tt),et=!0))},_showClone:function(t){"clone"===t.lastPutMode?et&&(z("showClone",this),Bt.eventCanceled||(q.parentNode!=$||this.options.group.revertClone?Q?$.insertBefore(tt,Q):$.appendChild(tt):$.insertBefore(tt,q),this.options.group.revertClone&&this.animate(q,tt),P(tt,"display",""),et=!1)):this._hideClone()}},xt&&h(document,"touchmove",function(t){(Bt.active||yt)&&t.cancelable&&t.preventDefault()}),Bt.utils={on:h,off:f,css:P,find:b,is:function(t,e){return!!N(t,e,t,!1)},extend:function(t,e){if(t&&e)for(var n in e)e.hasOwnProperty(n)&&(t[n]=e[n]);return t},throttle:S,closest:N,toggleClass:I,clone:_,index:B,nextTick:Lt,cancelNextTick:Kt,detectDirection:It,getChild:X},Bt.get=function(t){return t[j]},Bt.mount=function(){for(var t=arguments.length,e=new Array(t),n=0;n<t;n++)e[n]=arguments[n];(e=e[0].constructor===Array?e[0]:e).forEach(function(t){if(!t.prototype||!t.prototype.constructor)throw"Sortable: Mounted plugin must be a constructor function, not ".concat({}.toString.call(t));t.utils&&(Bt.utils=M(M({},Bt.utils),t.utils)),K.mount(t)})},Bt.create=function(t,e){return new Bt(t,e)};var Wt,zt,Gt,Ut,qt,Vt,Zt=[],$t=!(Bt.version="1.15.0");function Qt(){Zt.forEach(function(t){clearInterval(t.pid)}),Zt=[]}function Jt(){clearInterval(Vt)}var te,ee=S(function(n,t,e,o){if(t.scroll){var i,r=(n.touches?n.touches[0]:n).clientX,a=(n.touches?n.touches[0]:n).clientY,l=t.scrollSensitivity,s=t.scrollSpeed,c=O(),u=!1;zt!==e&&(zt=e,Qt(),Wt=t.scroll,i=t.scrollFn,!0===Wt&&(Wt=A(e,!0)));var d=0,h=Wt;do{var f=h,p=k(f),g=p.top,m=p.bottom,v=p.left,b=p.right,y=p.width,w=p.height,E=void 0,D=void 0,S=f.scrollWidth,_=f.scrollHeight,C=P(f),T=f.scrollLeft,p=f.scrollTop,D=f===c?(E=y<S&&("auto"===C.overflowX||"scroll"===C.overflowX||"visible"===C.overflowX),w<_&&("auto"===C.overflowY||"scroll"===C.overflowY||"visible"===C.overflowY)):(E=y<S&&("auto"===C.overflowX||"scroll"===C.overflowX),w<_&&("auto"===C.overflowY||"scroll"===C.overflowY)),T=E&&(Math.abs(b-r)<=l&&T+y<S)-(Math.abs(v-r)<=l&&!!T),p=D&&(Math.abs(m-a)<=l&&p+w<_)-(Math.abs(g-a)<=l&&!!p);if(!Zt[d])for(var x=0;x<=d;x++)Zt[x]||(Zt[x]={});Zt[d].vx==T&&Zt[d].vy==p&&Zt[d].el===f||(Zt[d].el=f,Zt[d].vx=T,Zt[d].vy=p,clearInterval(Zt[d].pid),0==T&&0==p||(u=!0,Zt[d].pid=setInterval(function(){o&&0===this.layer&&Bt.active._onTouchMove(qt);var t=Zt[this.layer].vy?Zt[this.layer].vy*s:0,e=Zt[this.layer].vx?Zt[this.layer].vx*s:0;"function"==typeof i&&"continue"!==i.call(Bt.dragged.parentNode[j],e,t,n,qt,Zt[this.layer].el)||F(Zt[this.layer].el,e,t)}.bind({layer:d}),24))),d++}while(t.bubbleScroll&&h!==c&&(h=A(h,!1)));$t=u}},30),c=function(t){var e=t.originalEvent,n=t.putSortable,o=t.dragEl,i=t.activeSortable,r=t.dispatchSortableEvent,a=t.hideGhostForTarget,t=t.unhideGhostForTarget;e&&(i=n||i,a(),e=e.changedTouches&&e.changedTouches.length?e.changedTouches[0]:e,e=document.elementFromPoint(e.clientX,e.clientY),t(),i&&!i.el.contains(e)&&(r("spill"),this.onSpill({dragEl:o,putSortable:n})))};function ne(){}function oe(){}ne.prototype={startIndex:null,dragStart:function(t){t=t.oldDraggableIndex;this.startIndex=t},onSpill:function(t){var e=t.dragEl,n=t.putSortable;this.sortable.captureAnimationState(),n&&n.captureAnimationState();t=X(this.sortable.el,this.startIndex,this.options);t?this.sortable.el.insertBefore(e,t):this.sortable.el.appendChild(e),this.sortable.animateAll(),n&&n.animateAll()},drop:c},a(ne,{pluginName:"revertOnSpill"}),oe.prototype={onSpill:function(t){var e=t.dragEl,t=t.putSortable||this.sortable;t.captureAnimationState(),e.parentNode&&e.parentNode.removeChild(e),t.animateAll()},drop:c},a(oe,{pluginName:"removeOnSpill"});var ie,re,ae,le,se,ce=[],ue=[],de=!1,he=!1,fe=!1;function pe(n,o){ue.forEach(function(t,e){e=o.children[t.sortableIndex+(n?Number(e):0)];e?o.insertBefore(t,e):o.appendChild(t)})}function ge(){ce.forEach(function(t){t!==ae&&t.parentNode&&t.parentNode.removeChild(t)})}return Bt.mount(new function(){function t(){for(var t in this.defaults={scroll:!0,forceAutoScrollFallback:!1,scrollSensitivity:30,scrollSpeed:10,bubbleScroll:!0},this)"_"===t.charAt(0)&&"function"==typeof this[t]&&(this[t]=this[t].bind(this))}return t.prototype={dragStarted:function(t){t=t.originalEvent;this.sortable.nativeDraggable?h(document,"dragover",this._handleAutoScroll):this.options.supportPointer?h(document,"pointermove",this._handleFallbackAutoScroll):t.touches?h(document,"touchmove",this._handleFallbackAutoScroll):h(document,"mousemove",this._handleFallbackAutoScroll)},dragOverCompleted:function(t){t=t.originalEvent;this.options.dragOverBubble||t.rootEl||this._handleAutoScroll(t)},drop:function(){this.sortable.nativeDraggable?f(document,"dragover",this._handleAutoScroll):(f(document,"pointermove",this._handleFallbackAutoScroll),f(document,"touchmove",this._handleFallbackAutoScroll),f(document,"mousemove",this._handleFallbackAutoScroll)),Jt(),Qt(),clearTimeout(g),g=void 0},nulling:function(){qt=zt=Wt=$t=Vt=Gt=Ut=null,Zt.length=0},_handleFallbackAutoScroll:function(t){this._handleAutoScroll(t,!0)},_handleAutoScroll:function(e,n){var o,i=this,r=(e.touches?e.touches[0]:e).clientX,a=(e.touches?e.touches[0]:e).clientY,t=document.elementFromPoint(r,a);qt=e,n||this.options.forceAutoScrollFallback||w||y||u?(ee(e,this.options,t,n),o=A(t,!0),!$t||Vt&&r===Gt&&a===Ut||(Vt&&Jt(),Vt=setInterval(function(){var t=A(document.elementFromPoint(r,a),!0);t!==o&&(o=t,Qt()),ee(e,i.options,t,n)},10),Gt=r,Ut=a)):this.options.bubbleScroll&&A(t,!0)!==O()?ee(e,this.options,A(t,!1),!1):Qt()}},a(t,{pluginName:"scroll",initializeByDefault:!0})}),Bt.mount(oe,ne),Bt.mount(new function(){function t(){this.defaults={swapClass:"sortable-swap-highlight"}}return t.prototype={dragStart:function(t){t=t.dragEl;te=t},dragOverValid:function(t){var e=t.completed,n=t.target,o=t.onMove,i=t.activeSortable,r=t.changed,a=t.cancel;i.options.swap&&(t=this.sortable.el,i=this.options,n&&n!==t&&(t=te,te=!1!==o(n)?(I(n,i.swapClass,!0),n):null,t&&t!==te&&I(t,i.swapClass,!1)),r(),e(!0),a())},drop:function(t){var e,n,o=t.activeSortable,i=t.putSortable,r=t.dragEl,a=i||this.sortable,l=this.options;te&&I(te,l.swapClass,!1),te&&(l.swap||i&&i.options.swap)&&r!==te&&(a.captureAnimationState(),a!==o&&o.captureAnimationState(),n=te,t=(e=r).parentNode,l=n.parentNode,t&&l&&!t.isEqualNode(n)&&!l.isEqualNode(e)&&(i=B(e),r=B(n),t.isEqualNode(l)&&i<r&&r++,t.insertBefore(n,t.children[i]),l.insertBefore(e,l.children[r])),a.animateAll(),a!==o&&o.animateAll())},nulling:function(){te=null}},a(t,{pluginName:"swap",eventProperties:function(){return{swapItem:te}}})}),Bt.mount(new function(){function t(o){for(var t in this)"_"===t.charAt(0)&&"function"==typeof this[t]&&(this[t]=this[t].bind(this));o.options.avoidImplicitDeselect||(o.options.supportPointer?h(document,"pointerup",this._deselectMultiDrag):(h(document,"mouseup",this._deselectMultiDrag),h(document,"touchend",this._deselectMultiDrag))),h(document,"keydown",this._checkKeyDown),h(document,"keyup",this._checkKeyUp),this.defaults={selectedClass:"sortable-selected",multiDragKey:null,avoidImplicitDeselect:!1,setData:function(t,e){var n="";ce.length&&re===o?ce.forEach(function(t,e){n+=(e?", ":"")+t.textContent}):n=e.textContent,t.setData("Text",n)}}}return t.prototype={multiDragKeyDown:!1,isMultiDrag:!1,delayStartGlobal:function(t){t=t.dragEl;ae=t},delayEnded:function(){this.isMultiDrag=~ce.indexOf(ae)},setupClone:function(t){var e=t.sortable,t=t.cancel;if(this.isMultiDrag){for(var n=0;n<ce.length;n++)ue.push(_(ce[n])),ue[n].sortableIndex=ce[n].sortableIndex,ue[n].draggable=!1,ue[n].style["will-change"]="",I(ue[n],this.options.selectedClass,!1),ce[n]===ae&&I(ue[n],this.options.chosenClass,!1);e._hideClone(),t()}},clone:function(t){var e=t.sortable,n=t.rootEl,o=t.dispatchSortableEvent,t=t.cancel;this.isMultiDrag&&(this.options.removeCloneOnHide||ce.length&&re===e&&(pe(!0,n),o("clone"),t()))},showClone:function(t){var e=t.cloneNowShown,n=t.rootEl,t=t.cancel;this.isMultiDrag&&(pe(!1,n),ue.forEach(function(t){P(t,"display","")}),e(),se=!1,t())},hideClone:function(t){var e=this,n=(t.sortable,t.cloneNowHidden),t=t.cancel;this.isMultiDrag&&(ue.forEach(function(t){P(t,"display","none"),e.options.removeCloneOnHide&&t.parentNode&&t.parentNode.removeChild(t)}),n(),se=!0,t())},dragStartGlobal:function(t){t.sortable;!this.isMultiDrag&&re&&re.multiDrag._deselectMultiDrag(),ce.forEach(function(t){t.sortableIndex=B(t)}),ce=ce.sort(function(t,e){return t.sortableIndex-e.sortableIndex}),fe=!0},dragStarted:function(t){var e,n=this,t=t.sortable;this.isMultiDrag&&(this.options.sort&&(t.captureAnimationState(),this.options.animation&&(ce.forEach(function(t){t!==ae&&P(t,"position","absolute")}),e=k(ae,!1,!0,!0),ce.forEach(function(t){t!==ae&&C(t,e)}),de=he=!0)),t.animateAll(function(){de=he=!1,n.options.animation&&ce.forEach(function(t){T(t)}),n.options.sort&&ge()}))},dragOver:function(t){var e=t.target,n=t.completed,t=t.cancel;he&&~ce.indexOf(e)&&(n(!1),t())},revert:function(t){var n,o,e=t.fromSortable,i=t.rootEl,r=t.sortable,a=t.dragRect;1<ce.length&&(ce.forEach(function(t){r.addAnimationState({target:t,rect:he?k(t):a}),T(t),t.fromRect=a,e.removeAnimationState(t)}),he=!1,n=!this.options.removeCloneOnHide,o=i,ce.forEach(function(t,e){e=o.children[t.sortableIndex+(n?Number(e):0)];e?o.insertBefore(t,e):o.appendChild(t)}))},dragOverCompleted:function(t){var e,n=t.sortable,o=t.isOwner,i=t.insertion,r=t.activeSortable,a=t.parentEl,l=t.putSortable,t=this.options;i&&(o&&r._hideClone(),de=!1,t.animation&&1<ce.length&&(he||!o&&!r.options.sort&&!l)&&(e=k(ae,!1,!0,!0),ce.forEach(function(t){t!==ae&&(C(t,e),a.appendChild(t))}),he=!0),o||(he||ge(),1<ce.length?(o=se,r._showClone(n),r.options.animation&&!se&&o&&ue.forEach(function(t){r.addAnimationState({target:t,rect:le}),t.fromRect=le,t.thisAnimationDuration=null})):r._showClone(n)))},dragOverAnimationCapture:function(t){var e=t.dragRect,n=t.isOwner,t=t.activeSortable;ce.forEach(function(t){t.thisAnimationDuration=null}),t.options.animation&&!n&&t.multiDrag.isMultiDrag&&(le=a({},e),e=v(ae,!0),le.top-=e.f,le.left-=e.e)},dragOverAnimationComplete:function(){he&&(he=!1,ge())},drop:function(t){var e=t.originalEvent,n=t.rootEl,o=t.parentEl,i=t.sortable,r=t.dispatchSortableEvent,a=t.oldIndex,l=t.putSortable,s=l||this.sortable;if(e){var c,u,d,h=this.options,f=o.children;if(!fe)if(h.multiDragKey&&!this.multiDragKeyDown&&this._deselectMultiDrag(),I(ae,h.selectedClass,!~ce.indexOf(ae)),~ce.indexOf(ae))ce.splice(ce.indexOf(ae),1),ie=null,W({sortable:i,rootEl:n,name:"deselect",targetEl:ae,originalEvent:e});else{if(ce.push(ae),W({sortable:i,rootEl:n,name:"select",targetEl:ae,originalEvent:e}),e.shiftKey&&ie&&i.el.contains(ie)){var p=B(ie),t=B(ae);if(~p&&~t&&p!==t)for(var g,m=p<t?(g=p,t):(g=t,p+1);g<m;g++)~ce.indexOf(f[g])||(I(f[g],h.selectedClass,!0),ce.push(f[g]),W({sortable:i,rootEl:n,name:"select",targetEl:f[g],originalEvent:e}))}else ie=ae;re=s}fe&&this.isMultiDrag&&(he=!1,(o[j].options.sort||o!==n)&&1<ce.length&&(c=k(ae),u=B(ae,":not(."+this.options.selectedClass+")"),!de&&h.animation&&(ae.thisAnimationDuration=null),s.captureAnimationState(),de||(h.animation&&(ae.fromRect=c,ce.forEach(function(t){var e;t.thisAnimationDuration=null,t!==ae&&(e=he?k(t):c,t.fromRect=e,s.addAnimationState({target:t,rect:e}))})),ge(),ce.forEach(function(t){f[u]?o.insertBefore(t,f[u]):o.appendChild(t),u++}),a===B(ae)&&(d=!1,ce.forEach(function(t){t.sortableIndex!==B(t)&&(d=!0)}),d&&r("update"))),ce.forEach(function(t){T(t)}),s.animateAll()),re=s),(n===o||l&&"clone"!==l.lastPutMode)&&ue.forEach(function(t){t.parentNode&&t.parentNode.removeChild(t)})}},nullingGlobal:function(){this.isMultiDrag=fe=!1,ue.length=0},destroyGlobal:function(){this._deselectMultiDrag(),f(document,"pointerup",this._deselectMultiDrag),f(document,"mouseup",this._deselectMultiDrag),f(document,"touchend",this._deselectMultiDrag),f(document,"keydown",this._checkKeyDown),f(document,"keyup",this._checkKeyUp)},_deselectMultiDrag:function(t){if(!(void 0!==fe&&fe||re!==this.sortable||t&&N(t.target,this.options.draggable,this.sortable.el,!1)||t&&0!==t.button))for(;ce.length;){var e=ce[0];I(e,this.options.selectedClass,!1),ce.shift(),W({sortable:this.sortable,rootEl:this.sortable.el,name:"deselect",targetEl:e,originalEvent:t})}},_checkKeyDown:function(t){t.key===this.options.multiDragKey&&(this.multiDragKeyDown=!0)},_checkKeyUp:function(t){t.key===this.options.multiDragKey&&(this.multiDragKeyDown=!1)}},a(t,{pluginName:"multiDrag",utils:{select:function(t){var e=t.parentNode[j];e&&e.options.multiDrag&&!~ce.indexOf(t)&&(re&&re!==e&&(re.multiDrag._deselectMultiDrag(),re=e),I(t,e.options.selectedClass,!0),ce.push(t))},deselect:function(t){var e=t.parentNode[j],n=ce.indexOf(t);e&&e.options.multiDrag&&~n&&(I(t,e.options.selectedClass,!1),ce.splice(n,1))}},eventProperties:function(){var n=this,o=[],i=[];return ce.forEach(function(t){var e;o.push({multiDragElement:t,index:t.sortableIndex}),e=he&&t!==ae?-1:he?B(t,":not(."+n.options.selectedClass+")"):B(t),i.push({multiDragElement:t,index:e})}),{items:r(ce),clones:[].concat(ue),oldIndicies:o,newIndicies:i}},optionListeners:{multiDragKey:function(t){return"ctrl"===(t=t.toLowerCase())?t="Control":1<t.length&&(t=t.charAt(0).toUpperCase()+t.substr(1)),t}}})}),Bt});;
/**
 * @file
 * Provides the admin UI for CKEditor 5.
 */

((Drupal, drupalSettings, $, JSON, once, Sortable, { tabbable }) => {
  const toolbarHelp = [
    {
      message: Drupal.t(
        "The toolbar buttons that don't fit the user's browser window width will be grouped in a dropdown. If multiple toolbar rows are preferred, those can be configured by adding an explicit wrapping breakpoint wherever you want to start a new row.",
        null,
        {
          context:
            'CKEditor 5 toolbar help text, default, no explicit wrapping breakpoint',
        },
      ),
      button: 'wrapping',
      condition: false,
    },
    {
      message: Drupal.t(
        'You have configured a multi-row toolbar by using an explicit wrapping breakpoint. This may not work well in narrow browser windows. To use automatic grouping, remove any of these divider buttons.',
        null,
        {
          context:
            'CKEditor 5 toolbar help text, with explicit wrapping breakpoint',
        },
      ),
      button: 'wrapping',
      condition: true,
    },
  ];

  /**
   * Allows attaching listeners to a value.
   *
   * @type {Observable}
   */
  const Observable = class {
    /**
     * Creates new Observable with a value.
     *
     * @param {*} value
     *   The value to be observed.
     */
    constructor(value) {
      this._listeners = [];
      this._value = value;
    }

    /**
     * Notifies subscribers about new values.
     */
    notify() {
      this._listeners.forEach((listener) => listener(this._value));
    }

    /**
     * Subscribes a listener callback to changes.
     *
     * @param {Function} listener
     *   The function to be called when a new value is set.
     */
    subscribe(listener) {
      this._listeners.push(listener);
    }

    /**
     * The value of the observable.
     *
     * @return {*}
     *   The current value.
     */
    get value() {
      return this._value;
    }

    /**
     * Sets the value of the observable and notifies subscribers.
     *
     * @param {*} val
     *   The new value of the observable.
     */
    set value(val) {
      if (val !== this._value) {
        this._value = val;
        this.notify();
      }
    }
  };

  /**
   * Gets selected buttons.
   *
   * @param {Array} selected
   *   The selected buttons retrieved from state.
   * @param {Array} dividers
   *   The available dividers.
   * @param {Array} available
   *   The available buttons.
   * @return {Array}
   *   An array containing selected buttons.
   */
  const getSelectedButtons = (selected, dividers, available) => {
    return selected.map((id) => ({
      ...[...dividers, ...available].find((button) => button.id === id),
    }));
  };

  /**
   * Updates selected buttons to the textarea.
   *
   * @param {Array} selection
   *   The current selection.
   * @param {Element} textarea
   *   The textarea element.
   */
  const updateSelectedButtons = (selection, textarea) => {
    const newValue = JSON.stringify(selection);

    const priorValue = textarea.innerHTML;
    textarea.value = newValue;
    textarea.innerHTML = newValue;

    // The textarea is programmatically updated, so no native JavaScript
    // event is triggered. Event listeners need to be aware of this config
    // update, so a custom event is dispatched immediately after the
    // config update.
    textarea.dispatchEvent(
      new CustomEvent('change', {
        detail: {
          priorValue,
        },
      }),
    );
  };

  /**
   * Function to add button to selected buttons.
   *
   * @param {Observable} selection
   *   The currently selected buttons.
   * @param {Element} element
   *   The element which is being added.
   * @param {function} announceChange
   *   Function to call to announce the change.
   */
  const addToSelectedButtons = (selection, element, announceChange) => {
    const list = [...selection.value];
    list.push(element.dataset.id);
    selection.value = list;

    if (announceChange) {
      setTimeout(() => {
        announceChange(element.dataset.label);
      });
    }
  };

  /**
   * Function to remove button from selected buttons.
   *
   * @param {Observable} selection
   *   The currently selected buttons.
   * @param {Element} element
   *   The element which is being removed.
   * @param {function} announceChange
   *   Function to call to announce the change.
   */
  const removeFromSelectedButtons = (selection, element, announceChange) => {
    const list = [...selection.value];
    const index = Array.from(element.parentElement.children).findIndex(
      (child) => {
        return child === element;
      },
    );
    list.splice(index, 1);
    selection.value = list;

    if (announceChange) {
      setTimeout(() => {
        announceChange(element.dataset.label);
      });
    }
  };

  /**
   * Moves element within active buttons.
   *
   * @param {Observable} selection
   *   The currently selected buttons.
   * @param {Element} element
   *   The element being moved.
   * @param {Number} dir
   *   The direction which the element is being moved.
   */
  const moveWithinSelectedButtons = (selection, element, dir) => {
    const list = [...selection.value];
    const index = Array.from(element.parentElement.children).findIndex(
      (child) => {
        return child === element;
      },
    );
    // If moving up, check it is not the first, else check it is not the last.
    const condition = dir < 0 ? index > 0 : index < list.length - 1;
    if (condition) {
      list.splice(index + dir, 0, list.splice(index, 1)[0]);
      selection.value = list;
    }
  };

  /**
   * Copies element to active buttons.
   *
   * @param {Observable} selection
   *   The currently selected buttons.
   * @param {Element} element
   *   The element to be copied.
   * @param {Function} announceChange
   *   A function to call to announce the change.
   */
  const copyToActiveButtons = (selection, element, announceChange) => {
    const list = [...selection.value];
    list.push(element.dataset.id);
    selection.value = list;

    setTimeout(() => {
      if (announceChange) {
        announceChange(element.dataset.label);
      }
    });
  };

  /**
   * Renders the CKEditor 5 button admin UI.
   *
   * @param {Element} root
   *   The element where the admin UI should be rendered.
   * @param {Observable} selectedButtons
   *   An Observable object containing selected buttons.
   * @param {Array} availableButtons
   *   An array containing available buttons.
   * @param {Array} dividerButtons
   *   An array containing available divider buttons.
   */
  const render = (root, selectedButtons, availableButtons, dividerButtons) => {
    const toolbarHelpText = toolbarHelp
      .filter(
        (helpItem) =>
          selectedButtons.value.includes(helpItem.button) ===
          helpItem.condition,
      )
      .map((helpItem) => helpItem.message);

    // Get the existing toolbar help message.
    const existingToolbarHelpText = document.querySelector(
      '[data-drupal-selector="ckeditor5-admin-help-message"]',
    );

    // If the existing toolbar help message does not match the message that is
    // about to be rendered, it is new information that should be conveyed to
    // assistive tech via announce().
    if (
      existingToolbarHelpText &&
      toolbarHelpText.join('').trim() !==
        existingToolbarHelpText.textContent.trim()
    ) {
      Drupal.announce(toolbarHelpText.join(' '));
    }

    root.innerHTML = Drupal.theme.ckeditor5Admin({
      availableButtons: Drupal.theme.ckeditor5AvailableButtons({
        buttons: availableButtons.filter(
          (button) => !selectedButtons.value.includes(button.id),
        ),
      }),
      dividerButtons: Drupal.theme.ckeditor5DividerButtons({
        buttons: dividerButtons,
      }),
      activeToolbar: Drupal.theme.ckeditor5SelectedButtons({
        buttons: getSelectedButtons(
          selectedButtons.value,
          dividerButtons,
          availableButtons,
        ),
      }),
      helpMessage: toolbarHelpText,
    });

    // Create sortable groups for available buttons, current toolbar items,
    // and dividers.
    new Sortable(
      root.querySelector(
        '[data-button-list="ckeditor5-toolbar-active-buttons"]',
      ),
      {
        group: { name: 'toolbar', put: ['divider', 'available'] },
        sort: true,
        store: {
          set: (sortable) => {
            selectedButtons.value = sortable.toArray();
          },
        },
      },
    );
    const toolbarAvailableButtons = new Sortable(
      root.querySelector(
        '[data-button-list="ckeditor5-toolbar-available-buttons"]',
      ),
      {
        group: { name: 'available', put: ['toolbar'] },
        sort: false,
        onAdd: (event) => {
          // If the moved item is a divider, it should not be added to
          // the available buttons list.
          if (
            dividerButtons.find(
              (dividerButton) => dividerButton.id === event.item.dataset.id,
            )
          ) {
            const { newIndex } = event;
            setTimeout(() => {
              // Remove the divider button from the available buttons
              // list. Draggable reassesses the lists during each drag
              // event, so the DOM removal should not be disruptive.
              document
                .querySelectorAll('.ckeditor5-toolbar-available__buttons li')
                [newIndex].remove();
            });
          }
        },
      },
    );
    new Sortable(
      root.querySelector(
        '[data-button-list="ckeditor5-toolbar-divider-buttons"]',
      ),
      {
        group: { name: 'divider', put: false, pull: 'clone', sort: 'false' },
      },
    );

    root
      .querySelectorAll('[data-drupal-selector="ckeditor5-toolbar-button"]')
      .forEach((element) => {
        const expandButton = (event) => {
          event.currentTarget
            .querySelectorAll('.ckeditor5-toolbar-button')
            .forEach((buttonElement) => {
              buttonElement.setAttribute('data-expanded', true);
            });
        };
        const retractButton = (event) => {
          event.currentTarget
            .querySelectorAll('.ckeditor5-toolbar-button')
            .forEach((buttonElement) => {
              buttonElement.setAttribute('data-expanded', false);
            });
        };
        element.addEventListener('mouseenter', expandButton);
        element.addEventListener('focus', expandButton);
        element.addEventListener('mouseleave', retractButton);
        element.addEventListener('blur', retractButton);

        element.addEventListener('keyup', (event) => {
          // Keys supported by the admin UI. Depending on the element that is
          // triggering the event, the event could trigger changes in the state.
          // Changes to the state trigger re-rendering of the admin UI, which
          // means that for consistent navigation, each action modifying state
          // needs to set focus back on the button that is being moved. The state
          // change also triggers an AJAX request which re-renders parts of the
          // form, and moves the focus to the triggering form element, meaning
          // that focus needs to be set back on the button again.
          const supportedKeys = [
            'ArrowLeft',
            'ArrowRight',
            'ArrowUp',
            'ArrowDown',
          ];
          const dir = document.documentElement.dir;
          if (supportedKeys.includes(event.key)) {
            if (event.currentTarget.dataset.divider.toLowerCase() === 'true') {
              switch (event.key) {
                case 'ArrowDown': {
                  const announceChange = (name) => {
                    Drupal.announce(
                      Drupal.t(
                        'Button @name has been copied to the active toolbar.',
                        { '@name': name },
                      ),
                    );
                  };
                  copyToActiveButtons(
                    selectedButtons,
                    event.currentTarget,
                    announceChange,
                  );
                  // Focus the last button since new button is always added to the
                  // end of the list.
                  root
                    .querySelector(
                      '[data-button-list="ckeditor5-toolbar-active-buttons"] li:last-child',
                    )
                    .focus();
                  break;
                }
              }
            } else if (
              selectedButtons.value.includes(event.currentTarget.dataset.id)
            ) {
              const index = Array.from(
                element.parentElement.children,
              ).findIndex((child) => {
                return child === element;
              });
              switch (event.key) {
                case 'ArrowLeft': {
                  const leftOffset = dir === 'ltr' ? -1 : 1;
                  moveWithinSelectedButtons(
                    selectedButtons,
                    event.currentTarget,
                    leftOffset,
                  );
                  // Move focus to left or right from the current index depending
                  // on current language direction. Use index instead of the
                  // data-id because dividers don't have a unique ID.
                  root
                    .querySelectorAll(
                      '[data-button-list="ckeditor5-toolbar-active-buttons"] li',
                    )
                    [index + leftOffset].focus();
                  break;
                }
                case 'ArrowRight': {
                  const rightOffset = dir === 'ltr' ? 1 : -1;
                  moveWithinSelectedButtons(
                    selectedButtons,
                    event.currentTarget,
                    rightOffset,
                  );
                  // Move focus to right or left from the current index depending
                  // on current language direction. Use index instead of the
                  // data-id because dividers don't have a unique ID.
                  root
                    .querySelectorAll(
                      '[data-button-list="ckeditor5-toolbar-active-buttons"] li',
                    )
                    [index + rightOffset].focus();
                  break;
                }
                case 'ArrowUp': {
                  const announceChange = (name) => {
                    Drupal.announce(
                      Drupal.t(
                        'Button @name has been removed from the active toolbar.',
                        { '@name': name },
                      ),
                    );
                  };
                  removeFromSelectedButtons(
                    selectedButtons,
                    event.currentTarget,
                    announceChange,
                  );
                  // Focus only if the button wasn't a divider because dividers
                  // are simply removed from the active buttons instead of moving
                  // to another list.
                  if (
                    !dividerButtons.find(
                      (dividerButton) =>
                        event.currentTarget.dataset.id === dividerButton.id,
                    )
                  ) {
                    // Focus button based on the data-id attribute from the
                    // available buttons list.
                    root
                      .querySelector(
                        `[data-button-list="ckeditor5-toolbar-available-buttons"] [data-id="${event.currentTarget.dataset.id}"]`,
                      )
                      .focus();
                  }
                  break;
                }
              }
            } else if (
              toolbarAvailableButtons
                .toArray()
                .includes(event.currentTarget.dataset.id)
            ) {
              switch (event.key) {
                case 'ArrowDown': {
                  const announceChange = (name) => {
                    Drupal.announce(
                      Drupal.t(
                        'Button @name has been moved to the active toolbar.',
                        { '@name': name },
                      ),
                    );
                  };
                  addToSelectedButtons(
                    selectedButtons,
                    event.currentTarget,
                    announceChange,
                  );
                  // Focus the last button since new button is always added to the
                  // end of the list.
                  root
                    .querySelector(
                      '[data-button-list="ckeditor5-toolbar-active-buttons"] li:last-child',
                    )
                    .focus();
                  break;
                }
              }
            }
          }
        });
      });
  };

  /**
   * Attach CKEditor 5 admin UI.
   *
   * @type {Drupal~behavior}
   *
   * @prop {Drupal~behaviorAttach} attach
   *   Attaches admin app to edit the CKEditor 5 toolbar.
   * @prop {Drupal~behaviorDetach} detach
   *   Detaches admin app from the CKEditor 5 configuration form on 'unload'.
   */
  Drupal.behaviors.ckeditor5Admin = {
    attach(context) {
      once('ckeditor5-admin-toolbar', '#ckeditor5-toolbar-app').forEach(
        (container) => {
          const selectedTextarea = context.querySelector(
            '#ckeditor5-toolbar-buttons-selected',
          );
          const available = Object.entries(
            JSON.parse(
              context.querySelector('#ckeditor5-toolbar-buttons-available')
                .innerHTML,
            ),
          ).map(([name, attrs]) => ({ name, id: name, ...attrs }));
          const dividers = [
            {
              id: 'divider',
              name: '|',
              label: Drupal.t('Divider'),
            },
            {
              id: 'wrapping',
              name: '-',
              label: Drupal.t('Wrapping'),
            },
          ];

          // Selected is used for managing the state. Sortable is handling updates
          // to the state when the system is operated by mouse. There are
          // functions making direct modifications to the state when system is
          // operated by keyboard.
          const selected = new Observable(
            JSON.parse(selectedTextarea.innerHTML).map((name) => {
              return [...dividers, ...available].find((button) => {
                return button.name === name;
              }).id;
            }),
          );

          const mapSelection = (selection) => {
            return selection.map((id) => {
              return [...dividers, ...available].find((button) => {
                return button.id === id;
              }).name;
            });
          };
          // Whenever the state is changed, update the textarea with the changes.
          // This will also trigger re-render of the admin UI to reinitialize the
          // Sortable state.
          selected.subscribe((selection) => {
            updateSelectedButtons(mapSelection(selection), selectedTextarea);
            render(container, selected, available, dividers);
          });

          [
            context.querySelector('#ckeditor5-toolbar-buttons-available'),
            context.querySelector('[class*="editor-settings-toolbar-items"]'),
          ]
            .filter((el) => el)
            .forEach((el) => {
              el.classList.add('visually-hidden');
            });

          render(container, selected, available, dividers);
        },
      );
      // Safari's focus outlines take into account absolute positioned elements.
      // When a toolbar option is blurred, the portion of the focus outline
      // surrounding the absolutely positioned tooltip does not go away. To
      // prevent keyboard navigation users from seeing outline artifacts for
      // every option they've tabbed through, we provide a keydown listener
      // that can catch blur-causing events before the blur happens. If the
      // tooltip is hidden before the blur event, the outline will disappear
      // correctly.
      once('safari-focus-fix', '.ckeditor5-toolbar-item').forEach((item) => {
        item.addEventListener('keydown', (e) => {
          const keyCodeDirections = {
            9: 'tab',
            37: 'left',
            38: 'up',
            39: 'right',
            40: 'down',
          };
          if (
            ['tab', 'left', 'up', 'right', 'down'].includes(
              keyCodeDirections[e.keyCode],
            )
          ) {
            let hideTip = false;
            const isActive = e.target.closest(
              '[data-button-list="ckeditor5-toolbar-active__buttons"]',
            );
            if (isActive) {
              if (
                ['tab', 'left', 'up', 'right'].includes(
                  keyCodeDirections[e.keyCode],
                )
              ) {
                hideTip = true;
              }
            } else if (['tab', 'down'].includes(keyCodeDirections[e.keyCode])) {
              hideTip = true;
            }
            if (hideTip) {
              e.target
                .querySelector('[data-expanded]')
                .setAttribute('data-expanded', 'false');
            }
          }
        });
      });

      /**
       * Updates the UI state info in the form's 'data-drupal-ui-state' attribute.
       *
       * @param {object} states
       *   An object with one or more items with the structure { ui-property: stored-value }
       */
      const updateUiStateStorage = (states) => {
        const form = document.querySelector(
          '#filter-format-edit-form, #filter-format-add-form',
        );

        // Get the current stored UI state as an object.
        const currentStates = form.hasAttribute('data-drupal-ui-state')
          ? JSON.parse(form.getAttribute('data-drupal-ui-state'))
          : {};

        // Store the updated UI state object as an object literal in the parent
        // form's 'data-drupal-ui-state' attribute.
        form.setAttribute(
          'data-drupal-ui-state',
          JSON.stringify({ ...currentStates, ...states }),
        );
      };

      /**
       * Gets a stored UI state property.
       *
       * @param {string} property
       *   The UI state property to retrieve the value of.
       *
       * @return {string|null}
       *   When present, the stored value of the property.
       */
      const getUiStateStorage = (property) => {
        const form = document.querySelector(
          '#filter-format-edit-form, #filter-format-add-form',
        );

        if (form === null) {
          return;
        }

        // Parse the object literal stored in the form's 'data-drupal-ui-state'
        // attribute and return the value of the object property that matches
        // the 'property' argument.
        return form.hasAttribute('data-drupal-ui-state')
          ? JSON.parse(form.getAttribute('data-drupal-ui-state'))[property]
          : null;
      };

      // Add an attribute to the parent form for storing UI states, so this
      // information can be retrieved after AJAX rebuilds.
      once(
        'ui-state-storage',
        '#filter-format-edit-form, #filter-format-add-form',
      ).forEach((form) => {
        form.setAttribute('data-drupal-ui-state', JSON.stringify({}));
      });

      /**
       * Maintains the active vertical tab after AJAX rebuild.
       *
       * @param {Element} verticalTabs
       *   The vertical tabs element.
       */
      const maintainActiveVerticalTab = (verticalTabs) => {
        const id = verticalTabs.id;

        // If the UI state storage has an active tab, click that tab.
        const activeTab = getUiStateStorage(`${id}-active-tab`);
        if (activeTab) {
          setTimeout(() => {
            const activeTabLink = document.querySelector(activeTab);
            activeTabLink.click();

            // Only change focus on the plugin-settings-wrapper element.
            if (id !== 'plugin-settings-wrapper') {
              return;
            }
            // If the current focused element is not the body, then the user
            // navigated away from the vertical tab area and is somewhere else
            // within the form. Do not change the current focus.
            if (document.activeElement !== document.body) {
              return;
            }
            // If the active element is the body then we can assume that the
            // focus was on an element that was replaced by an ajax command.
            // If that is the case restore the focus to the active tab that
            // was just rebuilt.
            const targetTabPane = document.querySelector(
              activeTabLink.getAttribute('href'),
            );
            if (targetTabPane) {
              const tabbableElements = tabbable(targetTabPane);
              if (tabbableElements.length) {
                tabbableElements[0].focus();
              }
            }
          });
        }

        // Add click listener that adds any tab click into UI storage.
        verticalTabs.querySelectorAll('.vertical-tabs__menu').forEach((tab) => {
          tab.addEventListener('click', (e) => {
            const state = {};
            const href = e.target
              .closest('[href]')
              .getAttribute('href')
              .split('--')[0];
            state[`${id}-active-tab`] = `#${id} [href^='${href}']`;
            updateUiStateStorage(state);
          });
        });
      };

      once(
        'maintainActiveVerticalTab',
        '#plugin-settings-wrapper, #filter-settings-wrapper',
      ).forEach(maintainActiveVerticalTab);

      // Add listeners to maintain focus after AJAX rebuilds.
      const selectedButtons = document.querySelector(
        '#ckeditor5-toolbar-buttons-selected',
      );

      once('textarea-listener', selectedButtons).forEach((textarea) => {
        textarea.addEventListener('change', (e) => {
          const buttonName = document.activeElement.getAttribute('data-id');
          if (!buttonName) {
            // If there is no 'data-id' attribute, then the config
            // is happening via mouse.
            return;
          }
          let focusSelector = '';

          // Divider elements are treated differently as there can be multiple
          // elements with the same button name.
          if (['divider', 'wrapping'].includes(buttonName)) {
            const oldConfig = JSON.parse(e.detail.priorValue);
            const newConfig = JSON.parse(e.target.innerHTML);

            // If the divider is being removed from active buttons, it does not
            // 'move' anywhere. Move focus to the prior active button
            if (oldConfig.length > newConfig.length) {
              for (let item = 0; item < newConfig.length; item++) {
                if (newConfig[item] !== oldConfig[item]) {
                  focusSelector = `[data-button-list="ckeditor5-toolbar-active-buttons"] li:nth-child(${Math.min(
                    item - 1,
                    0,
                  )})`;
                  break;
                }
              }
            } else if (oldConfig.length < newConfig.length) {
              // If the divider is being added, it will be the last active item.
              focusSelector =
                '[data-button-list="ckeditor5-toolbar-active-buttons"] li:last-child';
            } else {
              // When moving a dividers position within the active buttons.
              document
                .querySelectorAll(
                  `[data-button-list="ckeditor5-toolbar-active-buttons"] [data-id='${buttonName}']`,
                )
                .forEach((divider, index) => {
                  if (divider === document.activeElement) {
                    focusSelector = `${buttonName}|${index}`;
                  }
                });
            }
          } else {
            focusSelector = `[data-id='${buttonName}']`;
          }

          // Store the focus selector in an attribute on the form itself, which
          // will not be overwritten after the AJAX rebuild. This makes it
          // the value available to the textarea focus listener that is
          // triggered after the AJAX rebuild.
          updateUiStateStorage({ focusSelector });
        });

        textarea.addEventListener('focus', () => {
          // The selector that should receive focus is stored in the parent
          // form element. Move focus to that selector.
          const focusSelector = getUiStateStorage('focusSelector');

          if (focusSelector) {
            // If focusSelector includes '|', it is a separator that is being
            // moved within the active button list. Different logic us used to
            // determine focus since there can be multiple separators of the
            // same type within the active buttons list.
            if (focusSelector.includes('|')) {
              const [buttonName, count] = focusSelector.split('|');
              document
                .querySelectorAll(
                  `[data-button-list="ckeditor5-toolbar-active-buttons"] [data-id='${buttonName}']`,
                )
                .forEach((item, index) => {
                  if (index === parseInt(count, 10)) {
                    item.focus();
                  }
                });
            } else {
              const toFocus = document.querySelector(focusSelector);
              if (toFocus) {
                toFocus.focus();
              }
            }
          }
        });
      });
    },
  };

  /**
   * Theme function for CKEditor 5 selected buttons.
   *
   * @param {Object} options
   *   An object containing options.
   * @param {Array} options.buttons
   *   An array of selected buttons.
   * @return {string}
   *   The selected buttons markup.
   *
   * @private
   */
  Drupal.theme.ckeditor5SelectedButtons = ({ buttons }) => {
    return `
      <ul class="ckeditor5-toolbar-tray ckeditor5-toolbar-active__buttons" data-button-list="ckeditor5-toolbar-active-buttons" role="listbox" aria-orientation="horizontal" aria-labelledby="ckeditor5-toolbar-active-buttons-label">
        ${buttons
          .map((button) =>
            Drupal.theme.ckeditor5Button({ button, listType: 'active' }),
          )
          .join('')}
      </ul>
    `;
  };

  /**
   * Theme function for CKEditor 5 divider buttons.
   *
   * @param {Object} options
   *   An object containing options.
   * @param {Array} options.buttons
   *   An array of divider buttons.
   * @return {string}
   *   The CKEditor 5 divider buttons markup.
   *
   * @private
   */
  Drupal.theme.ckeditor5DividerButtons = ({ buttons }) => {
    return `
      <ul class="ckeditor5-toolbar-tray ckeditor5-toolbar-divider__buttons" data-button-list="ckeditor5-toolbar-divider-buttons" role="listbox" aria-orientation="horizontal" aria-labelledby="ckeditor5-toolbar-divider-buttons-label">
        ${buttons
          .map((button) =>
            Drupal.theme.ckeditor5Button({ button, listType: 'divider' }),
          )
          .join('')}
      </ul>
    `;
  };

  /**
   * Theme function for CKEditor 5 available buttons.
   *
   * @param {Object} options
   *   An object containing options.
   * @param {Array} options.buttons
   *   An array of available buttons.
   * @return {string}
   *   The CKEditor 5 available buttons markup.
   *
   * @private
   */
  Drupal.theme.ckeditor5AvailableButtons = ({ buttons }) => {
    return `
      <ul class="ckeditor5-toolbar-tray ckeditor5-toolbar-available__buttons" data-button-list="ckeditor5-toolbar-available-buttons" role="listbox" aria-orientation="horizontal" aria-labelledby="ckeditor5-toolbar-available-buttons-label">
        ${buttons
          .map((button) =>
            Drupal.theme.ckeditor5Button({ button, listType: 'available' }),
          )
          .join('')}
      </ul>
    `;
  };

  /**
   * Theme function for CKEditor 5 buttons.
   *
   * @param {Object} options
   *  An object containing options.
   * @param {Object} options.button
   *   An object containing button options.
   * @param {String} options.button.label
   *   Button label.
   * @param {String} options.button.id
   *   Button id.
   * @param {String} options.listType
   *   The type of the list.
   * @return {string}
   *   The CKEditor 5 buttons markup.
   *
   * @private
   */
  Drupal.theme.ckeditor5Button = ({ button: { label, id }, listType }) => {
    const buttonInstructions = {
      divider: Drupal.t(
        'Press the down arrow key to use this divider in the active button list',
      ),
      available: Drupal.t('Press the down arrow key to activate'),
      active: Drupal.t(
        'Press the up arrow key to deactivate. Use the right and left arrow keys to move position',
      ),
    };
    const visuallyHiddenLabel = Drupal.t(`@listType button @label`, {
      '@listType': listType !== 'divider' ? listType : 'available',
      '@label': label,
    });
    return `
      <li class="ckeditor5-toolbar-item ckeditor5-toolbar-item-${id}" role="option" tabindex="0" data-drupal-selector="ckeditor5-toolbar-button" data-id="${id}" data-label="${label}" data-divider="${
      listType === 'divider'
    }">
        <span class="ckeditor5-toolbar-button ckeditor5-toolbar-button-${id}">
          <span class="visually-hidden">${visuallyHiddenLabel}. ${
      buttonInstructions[listType]
    }</span>
        </span>
        <span class="ckeditor5-toolbar-tooltip" aria-hidden="true">${label} </span>
      </li>
    `;
  };

  /**
   * Theme function for CKEditor 5 admin UI.
   *
   * @param {Object} options
   *   An object containing options.
   * @param {String} options.availableButtons
   *   Markup for available buttons.
   * @param {String} options.dividerButtons
   *   Markup for divider buttons.
   * @param {String} options.activeToolbar
   *   Markup for active toolbar.
   * @param {Array} options.helpMessage
   *   An array of help messages.
   * @return {string}
   *   The CKEditor 5 admin UI markup.
   *
   * @private
   */
  Drupal.theme.ckeditor5Admin = ({
    availableButtons,
    dividerButtons,
    activeToolbar,
    helpMessage,
  }) => {
    return `
    <div data-drupal-selector="ckeditor5-admin-help-message">
      <p>${helpMessage.join('</p><p>')}</p>
    </div>
    <div class="ckeditor5-toolbar-disabled">
      <div class="ckeditor5-toolbar-available">
        <label id="ckeditor5-toolbar-available-buttons-label">${Drupal.t(
          'Available buttons',
        )}</label>
        ${availableButtons}
      </div>
      <div class="ckeditor5-toolbar-divider">
        <label id="ckeditor5-toolbar-divider-buttons-label">${Drupal.t(
          'Button divider',
        )}</label>
        ${dividerButtons}
      </div>
    </div>
    <div class="ckeditor5-toolbar-active">
      <label id="ckeditor5-toolbar-active-buttons-label">${Drupal.t(
        'Active toolbar',
      )}</label>
      ${activeToolbar}
    </div>
    `;
  };

  // Make a copy of the default filterStatus attach behaviors so it can be
  // called within this module's override of it.
  const originalFilterStatusAttach = Drupal.behaviors.filterStatus.attach;

  // Overrides the default filterStatus to provided functionality needs
  // specific to CKEditor 5.
  Drupal.behaviors.filterStatus.attach = (context, settings) => {
    const filterStatusCheckboxes = document.querySelectorAll(
      '#filters-status-wrapper input.form-checkbox',
    );

    // CKEditor 5 has uses cases that require updating the filter settings via
    // AJAX. When this happens, the checkboxes that enable filters must be
    // reprocessed by the filterStatus behavior. For this to occur:
    // 1. 'filter-status' must be removed from the element's once registry so
    //    the process can run again and take into account any filter settings
    //    elements that have been added or removed from the DOM.
    //    @see core/assets/vendor/once/once.js
    once.remove('filter-status', filterStatusCheckboxes);

    // 2. Any listeners to the 'click.filterUpdate' event should be removed so
    //    they do not conflict with event listeners that are added as part of
    //    the AJAX refresh.
    $(filterStatusCheckboxes).off('click.filterUpdate');

    // Call the original behavior.
    originalFilterStatusAttach(context, settings);
  };

  // Activates otherwise-inactive tabs that have form elements with validation
  // errors.
  // @todo Remove when https://www.drupal.org/project/drupal/issues/2911932 lands.
  Drupal.behaviors.tabErrorsVisible = {
    attach(context) {
      context.querySelectorAll('details .form-item .error').forEach((item) => {
        const details = item.closest('details');
        if (details.style.display === 'none') {
          const tabSelect = document.querySelector(`[href='#${details.id}']`);
          if (tabSelect) {
            tabSelect.click();
          }
        }
      });
    },
  };
})(Drupal, drupalSettings, jQuery, JSON, once, Sortable, tabbable);
;
