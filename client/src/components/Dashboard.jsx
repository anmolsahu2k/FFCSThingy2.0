import React, { useState, useEffect } from 'react';

import '../../node_modules/bootstrap/dist/css/bootstrap.min.css';
import {
	Container, Row, Col, Alert,
} from 'react-bootstrap';

// Components
import CourseSelectTable from './CourseSelectTable';
import SlotTable from './SlotTable';
import Timetable from './Timetable';
import SelectedCoursesTable from './SelectedCoursesTable';
import TimetableSwitcher from './TimetableSwitcher';
import CustomNavbar from './CustomNavbar';
import MagicFill from './MagicFill';

// Constants
import themeList from '../constants/Themes';
import CLASHMAP from '../constants/ClashMap';

import styles from '../css/Dashboard.module.scss';

import useAxiosFFCS from '../hooks/useAxiosFFCS';
import useInterval from '../hooks/useInterval';

// TODO: Make Add Slots to Timetable work for auto-add project

// const useStateWithLabel = (initialValue, name) => {
// 	const [value, setValue] = useState(initialValue);
// 	useDebugValue(`${name}: ${value}`);
// 	return [value, setValue];
// };

const AlertRow = ({ show = false, setShowAlert }) => (show ? (
	<Row>
		<Alert className={styles.alert} variant="danger" onClose={() => setShowAlert(false)} dismissible>
			<Alert.Heading>Courses Updated</Alert.Heading>
			<p>
				If you notice courses missing from your timetable, it might be due to them being removed to keep it in sync with the available courses from the Course Allocation Report.
			</p>
		</Alert>
	</Row>
) : (<></>));

const TTError = ({ error = '', setTimetableGenerationError }) => (error ? (
	<Row>
		<Alert
			variant="danger"
			onClose={() => setTimetableGenerationError('')}
			dismissible
		>
			<p>{error}</p>
		</Alert>
	</Row>
) : (<></>));

const Dashboard = ({ handleUnauth }) => {
	const [{ data: userData }] = useAxiosFFCS({
		url: '/account',
	});

	const [{ data: completedCoursesResponse }] = useAxiosFFCS({
		url: '/user/completedCourses',
	});

	const [{ data: curriculumListResponse }] = useAxiosFFCS({
		url: '/curriculum/prefixes',
	});

	const [{ data: heatmapResponse }, executeGetHeatmapResponse] = useAxiosFFCS({
		url: '/course/fullHeatmap',
	}, { manual: true });

	const [{ data: timetableResponse }, executeGetTimetableResponse] = useAxiosFFCS({
		url: '/user/selectedCourses',
	}, { manual: true });

	const [{ data: postSelectedCoursesResponse }, executePostSelectedCourses] = useAxiosFFCS({
		url: '/user/selectedCoursesBulk',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
	}, { manual: true });

	const [{ data: postGenerateTTResponse, loading: postGenerateTTLoading }, executePostGenerateTT] = useAxiosFFCS({
		url: '/ttgen/generateTimetable',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
	}, { manual: true });


	// Curriculum Prefix and Fetch
	const [selectedCurriculumPrefix, setSelectedCurriculumPrefix] = useState(localStorage.getItem('selectedCurriculum') || '19BCE');

	const [{ data: currentCurriculumResponse }, executeGetCurrentCurriculumResponse] = useAxiosFFCS({
		url: `curriculum/curriculumFromPrefix/${selectedCurriculumPrefix || '19BCE'}`,
	}, { manual: true });


	// Defaults
	const [activeTheme, setActiveTheme] = useState(localStorage.getItem('theme') || 'default');

	const [currentCurriculum, setCurrentCurriculum] = useState({});

	const [heatmap, setHeatmap] = useState(JSON.parse(localStorage.getItem('heatmap')) || []);
	const [heatmapTimestamp, setHeatmapTimestamp] = useState(localStorage.getItem('heatmapTimestamp') || null);

	const [clashmap, setClashmap] = useState(CLASHMAP);
	const [userTimetable, setUserTimetable] = useState([]);
	const [timetableNames, setTimetableNames] = useState(['Default']);
	const [activeTimetableName, setActiveTimetableName] = useState('Default');
	const [filledSlots, setFilledSlots] = useState([]);
	const [creditCount, setCreditCount] = useState(0);

	const [selectedCourseCode, setSelectedCourseCode] = useState('');
	const [currentlySelectedCourseSlots, setCurrentlySelectedCourseSlots] = useState([]);

	const [showMagicFill, setShowMagicFill] = useState(false);
	const [showAlert, setShowAlert] = useState(false);
	const [timetableGenerationError, setTimetableGenerationError] = useState('');


	// Sets theme for the app
	useEffect(() => {
		document.documentElement.className = '';
		localStorage.setItem('theme', activeTheme);
		document.documentElement.classList.add(`theme-${activeTheme}`);
	}, [activeTheme]);


	// Gets heatmap response from server
	useEffect(() => {
		executeGetHeatmapResponse();
	}, [executeGetHeatmapResponse]);

	// Sets up 2 minute interval for heatmap sync
	useInterval(executeGetHeatmapResponse, 1000 * 60 * 2);

	// Sets heatmap in state
	useEffect(() => {
		if (heatmapResponse) {
			setHeatmap(heatmapResponse.data.heatmap);
			setHeatmapTimestamp(heatmapResponse.data.timestamp);
		}
	}, [heatmapResponse]);

	// Sets currently selected course slots for SlotTable from heatmap
	useEffect(() => {
		if (heatmap) {
			const slots = heatmap.filter((course) => course.code === selectedCourseCode);
			setCurrentlySelectedCourseSlots(slots);
		}
	}, [selectedCourseCode, heatmap]);


	// Gets currently selected curriculum data from server
	useEffect(() => {
		executeGetCurrentCurriculumResponse();
	}, [executeGetCurrentCurriculumResponse, selectedCurriculumPrefix]);

	// Updates selected curriculum prefix in localStorage
	useEffect(() => {
		localStorage.setItem('selectedCurriculum', selectedCurriculumPrefix);
	}, [selectedCurriculumPrefix]);

	// Sets Curriculum in LocalStorage corresponding to prefix
	// Ex - 19BCE: {Data...}
	useEffect(() => {
		if (currentCurriculumResponse) {
			setCurrentCurriculum(currentCurriculumResponse.data);
			localStorage.setItem(selectedCurriculumPrefix, currentCurriculumResponse.data);
		}
	}, [currentCurriculumResponse, selectedCurriculumPrefix]);


	// Gets user timetable from the server
	useEffect(() => {
		executeGetTimetableResponse();
	}, [executeGetTimetableResponse]);

	// Sets up 3 minute interval for timetable sync
	useInterval(executeGetTimetableResponse, 1000 * 60);

	// Sets timetable in state
	useEffect(() => {
		if (timetableResponse) {
			setUserTimetable(timetableResponse.data);
		}
	}, [timetableResponse]);

	// Updates credit count, timetable names, filled slots when timetable/timetableName changes
	useEffect(() => {
		if (userTimetable) {
			const count = userTimetable.reduce((a, v) => a + Number(v.credits), 0);
			const ttNames = Array.from(
				new Set(
					userTimetable
						.reduce((a, v) => [...a, v.timetableName], [])
						.filter((v) => !!v),
				),
			);
			const slotsFilled = Array.from(
				new Set(
					userTimetable
						.filter((v) => v.timetableName === activeTimetableName)
						.reduce((a, v) => [...a, ...v.slot.replace(' ', '').split('+')], [])
						.filter((v) => v !== 'NIL'),
				),
			);

			setCreditCount(count);
			setTimetableNames(ttNames);
			setFilledSlots(slotsFilled);
		}
	}, [userTimetable, activeTimetableName]);

	// Updates clashmap when filled slots list changes
	useEffect(() => {
		setClashmap((prevClashmap) => {
			Object.keys(prevClashmap)
				.map((slot) => {
					if (filledSlots.includes(prevClashmap[slot])) {
						prevClashmap[slot].isFilled = true;
					}

					const currentClashes = prevClashmap[slot].clashesWith
						.reduce((acc, clashesWithSlot) => {
							if (filledSlots.includes(clashesWithSlot)) {
								acc.push(clashesWithSlot);
							}
							return acc;
						}, []);

					prevClashmap[slot].currentlyClashesWith = currentClashes;
					return slot;
				});
			return prevClashmap;
		});
	}, [filledSlots]);

	// TTGen
	useEffect(() => {
		if (postGenerateTTResponse) {
			const { success } = postGenerateTTResponse;
			if (success) {
				const { data } = postGenerateTTResponse;
				setUserTimetable((prevTimetable) => {
					let newTimetable = [...data];

					if (prevTimetable) {
						newTimetable = Array.from(
							new Set([...prevTimetable, ...newTimetable]),
						);
					}

					executePostSelectedCourses({
						data: { selected_courses: newTimetable },
					});

					return newTimetable;
				});
			} else {
				const { message } = postGenerateTTResponse;
				setTimetableGenerationError(message);
			}
		}
	}, [postGenerateTTResponse]);

	const isSelected = (course) => {
		if (userTimetable) {
			return userTimetable.find(
				(e) => e.code === course.code
					&& e.faculty === course.faculty
					&& e.slot === course.slot
					&& e.venue === course.venue
					&& e.course_type === course.course_type
					&& activeTimetableName === e.timetableName,
			);
		}
		return false;
	};

	const slotClashesWith = (slot) => {
		if (slot === 'NIL') return [];
		if (filledSlots.length === 0) return [];

		const clashingSlots = slot.replace(' ', '').split('+')
			.reduce((a, v) => Array.from(new Set([...a, ...clashmap[v].currentlyClashesWith])), [])
			.filter((v) => v && v.length > 0);

		return clashingSlots;
	};

	const addSlotToTimetable = (course) => {
		course.timetableName = activeTimetableName;
		const coursesToAdd = [course];
		let reqdProjectComponent;

		if (course.simpleCourseType !== 'Project') {
			reqdProjectComponent = heatmap.find(
				(v) => course.code === v.code
					&& course.faculty === v.faculty
					&& v.simpleCourseType === 'Project',
			);

			if (reqdProjectComponent && !isSelected(reqdProjectComponent)) {
				reqdProjectComponent = {
					...reqdProjectComponent,
					timetableName: activeTimetableName,
				};

				coursesToAdd.push(reqdProjectComponent);
			}
		}

		setUserTimetable((prevTimetable) => {
			let newTimetable = [...coursesToAdd];

			if (prevTimetable) {
				newTimetable = Array.from(
					new Set(prevTimetable.concat(newTimetable)),
				);
			}

			const reqdProperties = ['_id', 'code', 'course_type', 'credits', 'faculty', 'slot', 'venue', 'title', 'timetableName'];
			newTimetable = newTimetable.map((crs) => Object.keys(crs)
				.filter((key) => reqdProperties.includes(key))
				.reduce((acc, val) => ({
					...acc,
					[val]: crs[val],
				}), {}));

			executePostSelectedCourses({
				data: { selected_courses: newTimetable },
			});

			return newTimetable;
		});
	};

	const removeSlotFromTimetable = (course) => {
		course.timetableName = activeTimetableName;

		setUserTimetable((prevTimetable) => {
			const newTimetable = prevTimetable.filter(
				(v) => !(
					course.code === v.code
					&& course.faculty === v.faculty
					&& course.slot === v.slot
					&& course.venue === v.venue
					&& v.timetableName === activeTimetableName
				),
			);

			executePostSelectedCourses({
				data: { selected_courses: newTimetable },
			});

			return newTimetable;
		});
	};

	const createTimetable = (newName) => {
		if (timetableNames.includes(newName)) return;
		if (!newName) return;

		setTimetableNames((prevNames) => [...prevNames, newName]);
		setActiveTimetableName(newName);
	};

	const editTimetableName = (newName) => {
		const initialName = activeTimetableName;

		if (timetableNames.includes(newName)) return;
		if (!newName) return;
		if (initialName === 'Default') return;

		setUserTimetable((prevTimetable) => {
			const newTimetable = Array.from(
				new Set(
					prevTimetable
						.map((v) => {
							if (v.timetableName === initialName) {
								v.timetableName = newName;
							}
							return v;
						}),
				),
			);

			executePostSelectedCourses({
				data: { selected_courses: newTimetable },
			});

			return newTimetable;
		});

		setTimetableNames((prevNames) => prevNames.map((v) => (v === initialName ? newName : v)));
		setActiveTimetableName(newName);
	};

	const deleteTimetable = () => {
		const initialName = activeTimetableName;

		if (initialName === 'Default') return;

		setUserTimetable((prevTimetable) => {
			const newTimetable = prevTimetable
				.filter((v) => v.timetableName !== initialName);

			executePostSelectedCourses({
				data: { selected_courses: newTimetable },
			});

			return newTimetable;
		});

		setTimetableNames((prevNames) => prevNames.filter((v) => v !== initialName));
		setActiveTimetableName('Default');
	};

	const createTimetableCopy = (newName) => {
		const initialName = activeTimetableName;

		if (timetableNames.includes(newName)) return;
		if (!newName) return;

		setUserTimetable((prevTimetable) => {
			const oldTimetable = [...prevTimetable];

			const copiedCourses = prevTimetable
				.filter((v) => v.timetableName === initialName)
				.map((v) => {
					v.timetableName = newName;
					return v;
				});

			const newTimetable = [];
			newTimetable.push(...oldTimetable);
			newTimetable.push(...copiedCourses);

			executePostSelectedCourses({
				data: { selected_courses: newTimetable },
			});

			return newTimetable;
		});

		setTimetableNames((prevNames) => [...prevNames, newName]);
		setActiveTimetableName(newName);
	};

	const generateTimetable = (prefs) => {
		executePostGenerateTT({
			data: { pref: prefs },
		});
	};

	return (
		<Container fluid className={styles.mainContainer}>
			<Row className={styles.navBarRow}>
				<CustomNavbar
					userDetails={userData}
					creditCount={creditCount}
					themeList={themeList}
					curriculumList={curriculumListResponse ? curriculumListResponse.data : []}
					selectedCurriculum={selectedCurriculumPrefix}
					handleCurriculumChange={setSelectedCurriculumPrefix}
					changeActiveTheme={setActiveTheme}
					doLogout={handleUnauth}
				/>
			</Row>

			<Row className={styles.slotSelectionRow}>
				<Col xs={12} md={4}>
					<CourseSelectTable
						doSelectCourse={setSelectedCourseCode}

						completedCourses={completedCoursesResponse ? completedCoursesResponse.data : []}
						selectedCourse={selectedCourseCode}
						selectedCurriculum={currentCurriculum}
						selectedCurriculumPrefix={selectedCurriculumPrefix}
					/>
				</Col>

				<Col xs={12} md={8}>
					<SlotTable
						selectedCourseCode={selectedCourseCode}
						selectedCourseSlots={currentlySelectedCourseSlots}

						addSlotToTimetable={addSlotToTimetable}
						slotClashesWith={slotClashesWith}
						isSelected={isSelected}
					/>
				</Col>
			</Row>

			<Row>
				<Col>
					<TimetableSwitcher
						activeTimetableName={activeTimetableName}
						timetableNames={timetableNames}
						setActiveTimetableName={setActiveTimetableName}
						doEdit={editTimetableName}
						doDelete={deleteTimetable}
						doNew={createTimetable}
						doCopy={createTimetableCopy}
					/>
				</Col>
			</Row>

			<Row>
				<MagicFill
					show={showMagicFill}
					user={userData}
					inProcess={postGenerateTTLoading}
					genTT={(prefs) => { generateTimetable(prefs); }}
				/>
			</Row>

			<TTError
				error={timetableGenerationError}
				setTimetableGenerationError={setTimetableGenerationError}
			/>

			<AlertRow
				show={showAlert}
				setShowAlert={setShowAlert}
			/>

			<Row>
				<Timetable
					clashMap={clashmap}
					filledSlots={filledSlots}
					timetable={userTimetable || []}
					activeTimetableName={activeTimetableName}
				/>
			</Row>

			<Row>
				<SelectedCoursesTable
					timetable={userTimetable || []}
					unselectSlot={removeSlotFromTimetable}
					activeTimetableName={activeTimetableName}
					creditCount={creditCount}
				/>
			</Row>

		</Container>
	);
};

export default Dashboard;