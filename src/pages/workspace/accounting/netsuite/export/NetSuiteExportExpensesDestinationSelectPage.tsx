import {useRoute} from '@react-navigation/native';
import React, {useCallback} from 'react';
import type {ValueOf} from 'type-fest';
import RadioListItem from '@components/SelectionList/RadioListItem';
import type {ListItem} from '@components/SelectionList/types';
import SelectionScreen from '@components/SelectionScreen';
import type {SelectorType} from '@components/SelectionScreen';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import {updateNetSuiteNonReimbursableExpensesExportDestination, updateNetSuiteReimbursableExpensesExportDestination} from '@libs/actions/connections/NetSuiteCommands';
import {getLatestErrorField} from '@libs/ErrorUtils';
import type {PlatformStackRouteProp} from '@libs/Navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import {settingsPendingAction} from '@libs/PolicyUtils';
import Navigation from '@navigation/Navigation';
import {exportExpensesDestinationSettingName} from '@pages/workspace/accounting/netsuite/utils';
import type {WithPolicyConnectionsProps} from '@pages/workspace/withPolicyConnections';
import withPolicyConnections from '@pages/workspace/withPolicyConnections';
import {clearNetSuiteErrorField} from '@userActions/Policy/Policy';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

type MenuListItem = ListItem & {
    value: ValueOf<typeof CONST.NETSUITE_EXPORT_DESTINATION>;
};

function NetSuiteExportExpensesDestinationSelectPage({policy}: WithPolicyConnectionsProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const policyID = policy?.id;
    const config = policy?.connections?.netsuite?.options.config;

    const route = useRoute<PlatformStackRouteProp<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_EXPORT_EXPENSES_DESTINATION_SELECT>>();
    const params = route.params;
    const backTo = params.backTo;
    const isReimbursable = params.expenseType === CONST.NETSUITE_EXPENSE_TYPE.REIMBURSABLE;

    const currentSettingName = exportExpensesDestinationSettingName(isReimbursable);
    const currentDestination = config?.[currentSettingName];

    const data: MenuListItem[] = Object.values(CONST.NETSUITE_EXPORT_DESTINATION).map((dateType) => ({
        value: dateType,
        text: translate(`workspace.netsuite.exportDestination.values.${dateType}.label`),
        keyForList: dateType,
        isSelected: currentDestination === dateType,
    }));

    const goBack = useCallback(() => {
        Navigation.goBack(backTo ?? ROUTES.POLICY_ACCOUNTING_NETSUITE_EXPORT_EXPENSES.getRoute(policyID, params.expenseType));
    }, [backTo, policyID, params.expenseType]);

    const selectDestination = useCallback(
        (row: MenuListItem) => {
            if (row.value !== currentDestination && policyID) {
                if (isReimbursable) {
                    updateNetSuiteReimbursableExpensesExportDestination(policyID, row.value, currentDestination ?? CONST.NETSUITE_EXPORT_DESTINATION.EXPENSE_REPORT);
                } else {
                    updateNetSuiteNonReimbursableExpensesExportDestination(policyID, row.value, currentDestination ?? CONST.NETSUITE_EXPORT_DESTINATION.VENDOR_BILL);
                }
            }
            goBack();
        },
        [currentDestination, isReimbursable, policyID, goBack],
    );

    return (
        <SelectionScreen
            displayName={NetSuiteExportExpensesDestinationSelectPage.displayName}
            title="workspace.accounting.exportAs"
            sections={[{data}]}
            listItem={RadioListItem}
            onSelectRow={(selection: SelectorType) => selectDestination(selection as MenuListItem)}
            initiallyFocusedOptionKey={data.find((mode) => mode.isSelected)?.keyForList}
            policyID={policyID}
            accessVariants={[CONST.POLICY.ACCESS_VARIANTS.ADMIN]}
            featureName={CONST.POLICY.MORE_FEATURES.ARE_CONNECTIONS_ENABLED}
            onBackButtonPress={goBack}
            connectionName={CONST.POLICY.CONNECTIONS.NAME.NETSUITE}
            pendingAction={settingsPendingAction([currentSettingName], config?.pendingFields)}
            errors={getLatestErrorField(config, currentSettingName)}
            errorRowStyles={[styles.ph5, styles.pv3]}
            onClose={() => clearNetSuiteErrorField(policyID, currentSettingName)}
        />
    );
}

NetSuiteExportExpensesDestinationSelectPage.displayName = 'NetSuiteExportExpensesDestinationSelectPage';

export default withPolicyConnections(NetSuiteExportExpensesDestinationSelectPage);
