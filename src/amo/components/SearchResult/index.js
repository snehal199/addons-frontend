/* @flow */
import makeClassName from 'classnames';
import * as React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { compose } from 'redux';

import Link from 'amo/components/Link';
import { getAddonURL } from 'amo/utils';
import translate from 'core/i18n/translate';
import {
  ADDON_TYPE_DICT,
  ADDON_TYPE_LANG,
  ADDON_TYPE_STATIC_THEME,
  CLIENT_APP_ANDROID,
} from 'core/constants';
import { nl2br, sanitizeHTML } from 'core/utils';
import { addQueryParams } from 'core/utils/url';
import { getAddonIconUrl, getPreviewImage } from 'core/imageUtils';
import Icon from 'ui/components/Icon';
import LoadingText from 'ui/components/LoadingText';
import Rating from 'ui/components/Rating';
import PromotedBadge from 'ui/components/PromotedBadge';
import type { AppState } from 'amo/store';
import type { AddonType, CollectionAddonType } from 'core/types/addons';
import type { I18nType } from 'core/types/i18n';
import type { ReactRouterHistoryType } from 'core/types/router';

import './styles.scss';

type Props = {|
  addon?: AddonType | CollectionAddonType,
  addonInstallSource?: string,
  onClick?: (addon: AddonType | CollectionAddonType) => void,
  onImpression?: (addon: AddonType | CollectionAddonType) => void,
  showMetadata?: boolean,
  showRecommendedBadge?: boolean,
  showSummary?: boolean,
  useThemePlaceholder?: boolean,
|};

type InternalProps = {|
  ...Props,
  clientApp: string,
  history: ReactRouterHistoryType,
  i18n: I18nType,
  lang: string,
|};

export class SearchResultBase extends React.Component<InternalProps> {
  static defaultProps = {
    showMetadata: true,
    showRecommendedBadge: true,
    showSummary: true,
    useThemePlaceholder: false,
  };

  getAddonLink(
    addon: AddonType | CollectionAddonType,
    addonInstallSource?: string,
  ) {
    let linkTo = getAddonURL(addon.slug);
    if (addonInstallSource) {
      linkTo = addQueryParams(linkTo, { src: addonInstallSource });
    }
    return linkTo;
  }

  renderResult() {
    const {
      addon,
      addonInstallSource,
      clientApp,
      i18n,
      onImpression,
      showMetadata,
      showRecommendedBadge,
      showSummary,
      useThemePlaceholder,
    } = this.props;

    if (addon && onImpression) {
      onImpression(addon);
    }

    const averageDailyUsers = addon ? addon.average_daily_users : null;

    // Fall-back to default icon if invalid icon url.
    const iconURL = getAddonIconUrl(addon);

    let imageURL = iconURL;
    let addonTitle = <LoadingText />;

    if (addon) {
      addonTitle = (
        <Link
          className="SearchResult-link"
          to={this.getAddonLink(addon, addonInstallSource)}
          onClick={(e) => e.stopPropagation()}
        >
          {addon.name}
        </Link>
      );
    }

    if (addon && addon.type === ADDON_TYPE_STATIC_THEME) {
      imageURL = getPreviewImage(addon);
    }

    // Sets classes to handle fallback if theme preview is not available.
    const iconWrapperClassnames = makeClassName('SearchResult-icon-wrapper', {
      'SearchResult-icon-wrapper--no-theme-image': addon
        ? imageURL === null
        : useThemePlaceholder,
    });

    let addonAuthors = null;
    const addonAuthorsData =
      addon && addon.authors && addon.authors.length ? addon.authors : null;
    if (!addon || addonAuthorsData) {
      // TODO: list all authors.
      // https://github.com/mozilla/addons-frontend/issues/4461
      const author = addonAuthorsData && addonAuthorsData[0];
      addonAuthors = (
        <h3 className="SearchResult-author SearchResult--meta-section">
          {author ? author.name : <LoadingText />}
        </h3>
      );
    }

    let summary = null;
    if (showSummary) {
      const summaryProps = {};
      if (addon) {
        summaryProps.dangerouslySetInnerHTML = sanitizeHTML(addon.summary);
      } else {
        summaryProps.children = <LoadingText />;
      }

      summary = <p className="SearchResult-summary" {...summaryProps} />;
    }

    // This is needed for https://github.com/mozilla/addons-frontend/issues/9472
    const useDownloadsInsteadOfUsers =
      addon && [ADDON_TYPE_LANG, ADDON_TYPE_DICT].includes(addon.type);

    return (
      <div className="SearchResult-wrapper">
        <div className="SearchResult-result">
          <div className={iconWrapperClassnames}>
            {(addon && imageURL) || (!addon && !useThemePlaceholder) ? (
              <img
                className={makeClassName('SearchResult-icon', {
                  'SearchResult-icon--loading': !addon,
                })}
                src={imageURL}
                alt={addon ? `${addon.name}` : ''}
              />
            ) : (
              <p className="SearchResult-notheme">
                {i18n.gettext('No theme preview available')}
              </p>
            )}
          </div>

          <div className="SearchResult-contents">
            <h2 className="SearchResult-name">
              {addonTitle}
              {showRecommendedBadge &&
              addon &&
              addon.is_recommended &&
              clientApp !== CLIENT_APP_ANDROID ? (
                <PromotedBadge
                  category="recommended"
                  onClick={(e) => e.stopPropagation()}
                  size="small"
                />
              ) : null}
            </h2>
            {summary}

            {showMetadata ? (
              <div className="SearchResult-metadata">
                <div className="SearchResult-rating">
                  <Rating
                    rating={addon && addon.ratings ? addon.ratings.average : 0}
                    readOnly
                    styleSize="small"
                  />
                </div>
                {addonAuthors}
              </div>
            ) : null}

            {addon && addon.notes && (
              <div className="SearchResult-note">
                <h4 className="SearchResult-note-header">
                  <Icon name="comments-blue" />
                  {i18n.gettext('Add-on note')}
                </h4>
                <p
                  className="SearchResult-note-content"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={sanitizeHTML(nl2br(addon.notes), [
                    'br',
                  ])}
                />
              </div>
            )}
          </div>

          <h3 className="SearchResult-users SearchResult--meta-section">
            <Icon className="SearchResult-users-icon" name="user-fill" />
            <span className="SearchResult-users-text">
              {averageDailyUsers !== null && averageDailyUsers !== undefined ? (
                i18n.sprintf(
                  useDownloadsInsteadOfUsers
                    ? i18n.ngettext(
                        '%(total)s download',
                        '%(total)s downloads',
                        averageDailyUsers,
                      )
                    : i18n.ngettext(
                        '%(total)s user',
                        '%(total)s users',
                        averageDailyUsers,
                      ),
                  { total: i18n.formatNumber(averageDailyUsers) },
                )
              ) : (
                <LoadingText width={90} />
              )}
            </span>
          </h3>
        </div>
      </div>
    );
  }

  onClickResult = () => {
    const {
      addon,
      addonInstallSource,
      clientApp,
      history,
      lang,
      onClick,
    } = this.props;

    if (addon) {
      history.push(
        `/${lang}/${clientApp}${this.getAddonLink(addon, addonInstallSource)}`,
      );

      if (onClick) {
        onClick(addon);
      }
    }
  };

  render() {
    const { addon, useThemePlaceholder } = this.props;

    const result = this.renderResult();
    const resultClassnames = makeClassName('SearchResult', {
      'SearchResult--theme': addon
        ? ADDON_TYPE_STATIC_THEME === addon.type
        : useThemePlaceholder,
    });

    return (
      // Note: The link in question is still keyboard accessible because we've
      // added an actual link to the h2 tag.
      // eslint-disable-next-line max-len
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events
      <li onClick={this.onClickResult} className={resultClassnames}>
        {result}
      </li>
    );
  }
}

export const mapStateToProps = (state: AppState) => {
  return {
    clientApp: state.api.clientApp,
    lang: state.api.lang,
  };
};

const SearchResult: React.ComponentType<Props> = compose(
  withRouter,
  connect(mapStateToProps),
  translate(),
)(SearchResultBase);

export default SearchResult;
