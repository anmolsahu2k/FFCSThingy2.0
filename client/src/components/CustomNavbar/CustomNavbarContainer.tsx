import React, { FC } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import CustomNavbar from './CustomNavbar';

import State from '../../models/state/State';
import { CustomNavbarContainerProps } from '../../models/components/CustomNavbar/CustomNavbar';

const mapStateToProps = (state: State, ownProps: CustomNavbarContainerProps) => ({
	creditCount: state.timetable.creditCount,
	ownProps,
});

const mapDispatch = {};

const connector = connect(mapStateToProps, mapDispatch);
type PropsFromRedux = ConnectedProps<typeof connector>;

const CustomNavbarContainer: FC<PropsFromRedux> = (props) => (
	<CustomNavbar
		userDetails={props.ownProps.userDetails}
		creditCount={props.creditCount}
		doLogout={props.ownProps.doLogout as any}
	/>
);

export default connector(CustomNavbarContainer);
