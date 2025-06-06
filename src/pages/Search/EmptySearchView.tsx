import React, {useMemo, useRef, useState} from 'react';
// eslint-disable-next-line no-restricted-imports
import type {GestureResponderEvent, Text as RNText} from 'react-native';
import {Linking, View} from 'react-native';
import {useOnyx} from 'react-native-onyx';
import type {OnyxCollection} from 'react-native-onyx';
import BookTravelButton from '@components/BookTravelButton';
import ConfirmModal from '@components/ConfirmModal';
import EmptyStateComponent from '@components/EmptyStateComponent';
import type {FeatureListItem} from '@components/FeatureList';
import {Alert, PiggyBank} from '@components/Icon/Illustrations';
import LottieAnimations from '@components/LottieAnimations';
import MenuItem from '@components/MenuItem';
import PressableWithSecondaryInteraction from '@components/PressableWithSecondaryInteraction';
import ScrollView from '@components/ScrollView';
import SearchRowSkeleton from '@components/Skeletons/SearchRowSkeleton';
import Text from '@components/Text';
import TextLink from '@components/TextLink';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useEnvironment from '@hooks/useEnvironment';
import useLocalize from '@hooks/useLocalize';
import useReportIsArchived from '@hooks/useReportIsArchived';
import useStyleUtils from '@hooks/useStyleUtils';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import {startMoneyRequest} from '@libs/actions/IOU';
import {openExternalLink, openOldDotLink} from '@libs/actions/Link';
import {canActionTask, canModifyTask, completeTask} from '@libs/actions/Task';
import {setSelfTourViewed} from '@libs/actions/Welcome';
import interceptAnonymousUser from '@libs/interceptAnonymousUser';
import {hasSeenTourSelector} from '@libs/onboardingSelectors';
import {areAllGroupPoliciesExpenseChatDisabled} from '@libs/PolicyUtils';
import {generateReportID} from '@libs/ReportUtils';
import {getNavatticURL} from '@libs/TourUtils';
import {showContextMenu} from '@pages/home/report/ContextMenu/ReportActionContextMenu';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy} from '@src/types/onyx';
import type {SearchDataTypes} from '@src/types/onyx/SearchResults';

type EmptySearchViewProps = {
    type: SearchDataTypes;
    hasResults: boolean;
};

const tripsFeatures: FeatureListItem[] = [
    {
        icon: PiggyBank,
        translationKey: 'travel.features.saveMoney',
    },
    {
        icon: Alert,
        translationKey: 'travel.features.alerts',
    },
];

function EmptySearchView({type, hasResults}: EmptySearchViewProps) {
    const theme = useTheme();
    const StyleUtils = useStyleUtils();
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [modalVisible, setModalVisible] = useState(false);
    const [allPolicies] = useOnyx(ONYXKEYS.COLLECTION.POLICY, {canBeMissing: false});
    const shouldRedirectToExpensifyClassic = useMemo(() => {
        return areAllGroupPoliciesExpenseChatDisabled((allPolicies as OnyxCollection<Policy>) ?? {});
    }, [allPolicies]);

    const contextMenuAnchor = useRef<RNText>(null);
    const tripViewChildren = useMemo(() => {
        const onLongPress = (event: GestureResponderEvent | MouseEvent) => {
            showContextMenu({
                type: CONST.CONTEXT_MENU_TYPES.LINK,
                event,
                selection: CONST.BOOK_TRAVEL_DEMO_URL,
                contextMenuAnchor: contextMenuAnchor.current,
            });
        };

        return (
            <>
                <Text style={[styles.textSupporting, styles.textNormal]}>
                    {translate('travel.subtitle')}{' '}
                    <PressableWithSecondaryInteraction
                        inline
                        onSecondaryInteraction={onLongPress}
                        accessible
                        accessibilityLabel={translate('travel.bookADemo')}
                    >
                        <TextLink
                            onLongPress={onLongPress}
                            onPress={() => {
                                Linking.openURL(CONST.BOOK_TRAVEL_DEMO_URL);
                            }}
                            ref={contextMenuAnchor}
                        >
                            {translate('travel.bookADemo')}
                        </TextLink>
                    </PressableWithSecondaryInteraction>
                    {translate('travel.toLearnMore')}
                </Text>
                <View style={[styles.flex1, styles.flexRow, styles.flexWrap, styles.rowGap4, styles.pt4, styles.pl1, styles.mb5]}>
                    {tripsFeatures.map((tripsFeature) => (
                        <View
                            key={tripsFeature.translationKey}
                            style={styles.w100}
                        >
                            <MenuItem
                                title={translate(tripsFeature.translationKey)}
                                icon={tripsFeature.icon}
                                iconWidth={variables.menuIconSize}
                                iconHeight={variables.menuIconSize}
                                interactive={false}
                                displayInDefaultIconColor
                                wrapperStyle={[styles.p0, styles.cursorAuto]}
                                containerStyle={[styles.m0, styles.wAuto]}
                                numberOfLinesTitle={0}
                            />
                        </View>
                    ))}
                </View>
                <BookTravelButton text={translate('search.searchResults.emptyTripResults.buttonText')} />
            </>
        );
    }, [styles, translate]);

    const [introSelected] = useOnyx(ONYXKEYS.NVP_INTRO_SELECTED, {canBeMissing: true});
    const onboardingPurpose = introSelected?.choice;
    const {environment} = useEnvironment();
    const navatticURL = getNavatticURL(environment, onboardingPurpose);
    const [hasSeenTour = false] = useOnyx(ONYXKEYS.NVP_ONBOARDING, {
        selector: hasSeenTourSelector,
        canBeMissing: true,
    });
    const viewTourTaskReportID = introSelected?.viewTour;
    const [viewTourTaskReport] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${viewTourTaskReportID}`, {canBeMissing: false});
    const currentUserPersonalDetails = useCurrentUserPersonalDetails();
    const isReportArchived = useReportIsArchived(viewTourTaskReport?.parentReportID);
    const canModifyTheTask = canModifyTask(viewTourTaskReport, currentUserPersonalDetails.accountID, isReportArchived);
    const canActionTheTask = canActionTask(viewTourTaskReport, currentUserPersonalDetails.accountID);

    const content = useMemo(() => {
        switch (type) {
            case CONST.SEARCH.DATA_TYPES.TRIP:
                return {
                    headerMedia: LottieAnimations.TripsEmptyState,
                    headerContentStyles: [StyleUtils.getWidthAndHeightStyle(375, 240), StyleUtils.getBackgroundColorStyle(theme.travelBG)],
                    title: translate('travel.title'),
                    titleStyles: {...styles.textAlignLeft},
                    children: tripViewChildren,
                    lottieWebViewStyles: {backgroundColor: theme.travelBG, ...styles.emptyStateFolderWebStyles},
                };
            case CONST.SEARCH.DATA_TYPES.EXPENSE:
                if (!hasResults) {
                    return {
                        headerMedia: LottieAnimations.GenericEmptyState,
                        title: translate('search.searchResults.emptyExpenseResults.title'),
                        subtitle: translate(hasSeenTour ? 'search.searchResults.emptyExpenseResults.subtitleWithOnlyCreateButton' : 'search.searchResults.emptyExpenseResults.subtitle'),
                        buttons: [
                            ...(!hasSeenTour
                                ? [
                                      {
                                          buttonText: translate('emptySearchView.takeATestDrive'),
                                          buttonAction: () => {
                                              openExternalLink(navatticURL);
                                              setSelfTourViewed();
                                              if (viewTourTaskReport && canModifyTheTask && canActionTheTask) {
                                                  completeTask(viewTourTaskReport);
                                              }
                                          },
                                      },
                                  ]
                                : []),
                            {
                                buttonText: translate('iou.createExpense'),
                                buttonAction: () =>
                                    interceptAnonymousUser(() => {
                                        if (shouldRedirectToExpensifyClassic) {
                                            setModalVisible(true);
                                            return;
                                        }
                                        startMoneyRequest(CONST.IOU.TYPE.CREATE, generateReportID());
                                    }),
                                success: true,
                            },
                        ],
                        headerContentStyles: [styles.emptyStateFolderWebStyles, StyleUtils.getBackgroundColorStyle(theme.emptyFolderBG)],
                        lottieWebViewStyles: {backgroundColor: theme.emptyFolderBG, ...styles.emptyStateFolderWebStyles},
                    };
                }
            // We want to display the default nothing to show message if there is any filter applied.
            // eslint-disable-next-line no-fallthrough
            case CONST.SEARCH.DATA_TYPES.INVOICE:
                if (!hasResults) {
                    return {
                        headerMedia: LottieAnimations.GenericEmptyState,
                        title: translate('search.searchResults.emptyInvoiceResults.title'),
                        subtitle: translate(hasSeenTour ? 'search.searchResults.emptyInvoiceResults.subtitleWithOnlyCreateButton' : 'search.searchResults.emptyInvoiceResults.subtitle'),
                        buttons: [
                            ...(!hasSeenTour
                                ? [
                                      {
                                          buttonText: translate('emptySearchView.takeATestDrive'),
                                          buttonAction: () => {
                                              openExternalLink(navatticURL);
                                              setSelfTourViewed();
                                              if (viewTourTaskReport && canModifyTheTask && canActionTheTask) {
                                                  completeTask(viewTourTaskReport);
                                              }
                                          },
                                      },
                                  ]
                                : []),
                            {
                                buttonText: translate('workspace.invoices.sendInvoice'),
                                buttonAction: () =>
                                    interceptAnonymousUser(() => {
                                        if (shouldRedirectToExpensifyClassic) {
                                            setModalVisible(true);
                                            return;
                                        }
                                        startMoneyRequest(CONST.IOU.TYPE.INVOICE, generateReportID());
                                    }),
                                success: true,
                            },
                        ],
                        headerContentStyles: [styles.emptyStateFolderWebStyles, StyleUtils.getBackgroundColorStyle(theme.emptyFolderBG)],
                        lottieWebViewStyles: {backgroundColor: theme.emptyFolderBG, ...styles.emptyStateFolderWebStyles},
                    };
                }
            // eslint-disable-next-line no-fallthrough
            case CONST.SEARCH.DATA_TYPES.CHAT:
            default:
                return {
                    headerMedia: LottieAnimations.GenericEmptyState,
                    title: translate('search.searchResults.emptyResults.title'),
                    subtitle: translate('search.searchResults.emptyResults.subtitle'),
                    headerContentStyles: [styles.emptyStateFolderWebStyles, StyleUtils.getBackgroundColorStyle(theme.emptyFolderBG)],
                    lottieWebViewStyles: {backgroundColor: theme.emptyFolderBG, ...styles.emptyStateFolderWebStyles},
                };
        }
    }, [
        type,
        StyleUtils,
        theme.travelBG,
        theme.emptyFolderBG,
        translate,
        styles.textAlignLeft,
        styles.emptyStateFolderWebStyles,
        tripViewChildren,
        hasSeenTour,
        navatticURL,
        shouldRedirectToExpensifyClassic,
        hasResults,
        viewTourTaskReport,
        canModifyTheTask,
        canActionTheTask,
    ]);

    return (
        <>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.flexGrow1, styles.flexShrink0]}
            >
                <EmptyStateComponent
                    SkeletonComponent={SearchRowSkeleton}
                    headerMediaType={CONST.EMPTY_STATE_MEDIA.ANIMATION}
                    headerMedia={content.headerMedia}
                    headerStyles={[styles.emptyStateCardIllustrationContainer, styles.overflowHidden]}
                    title={content.title}
                    titleStyles={content.titleStyles}
                    subtitle={content.subtitle}
                    buttons={content.buttons}
                    headerContentStyles={[styles.h100, styles.w100, ...content.headerContentStyles]}
                    lottieWebViewStyles={content.lottieWebViewStyles}
                >
                    {content.children}
                </EmptyStateComponent>
            </ScrollView>
            <ConfirmModal
                prompt={translate('sidebarScreen.redirectToExpensifyClassicModal.description')}
                isVisible={modalVisible}
                onConfirm={() => {
                    setModalVisible(false);
                    openOldDotLink(CONST.OLDDOT_URLS.INBOX);
                }}
                onCancel={() => setModalVisible(false)}
                title={translate('sidebarScreen.redirectToExpensifyClassicModal.title')}
                confirmText={translate('exitSurvey.goToExpensifyClassic')}
                cancelText={translate('common.cancel')}
            />
        </>
    );
}

EmptySearchView.displayName = 'EmptySearchView';

export default EmptySearchView;
