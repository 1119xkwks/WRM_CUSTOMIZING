requires("uiplugin.popup");

// =============================================================================
/**
 * 전체 Scope에서 공유되는 Global 전역 변수, 상수, 공통 함수를 작성한다.
 *
 * @author Inswave Systems
 * @class gcm
 * @namespace gcm
 * @description
- gcm 객체는 WFrame Scope이 고려될 필요가 없고, com 공통 함수 객체나 전역에서 사용할 함수만을 작성한다.
- gcm 객체는 WFrame Scope별로 생성되지 않고, 전역 객체로 1개만 생성된다.
- gcm 객체 내에서는 함수를 호출한 화면의 Scope을 찾을 수 없기 때문에 Scope 확인이 필요한 경우 $p 객체를 파라미터로 전달해야 한다.

※ 주의사항
- gcm 객체 내 변수와 함수는 업무 화면 개발 시에는 사용 금지
 */
// =============================================================================

var gcm = {
	// 서버 통신 서비스 호출을 위한 Context Path
	CONTEXT_PATH : "",

	// 서버 통신 서비스 호출을 위한 Service Url (Context Path 이하 경로)
	SERVICE_URL : "",

	// 서버 통신 기본 모드 ( "asynchronous" / "synchronous") - "synchronous"는 비권장 통신 방식임
	DEFAULT_OPTIONS_MODE : "asynchronous",

	// 서버 통신 기본 미디어 타입
	DEFAULT_OPTIONS_MEDIATYPE : "application/json",

	// 통신 상태 코드
	MESSAGE_CODE : {
		STATUS_ERROR : "E",
		STATUS_SUCCESS : "S",
		STATUS_WARNING : "W",
		STATUS_INFO : "I"
	},
	
	// 메시지 레이어 인덱스
	MESSAGE_IDX : 1,
	
	// 공통 코드 저장을 위한 DataList 속성 정보
	DATA_PREFIX : "dlt_commonCode",

	COMMON_CODE_INFO : {
		LABEL : "CODE_NM",
		VALUE : "COM_CD",
		FILED_ARR : [ "GRP_CD", "COM_CD", "CODE_NM" ]
	},
	
	// 공통 코드 데이터
	commonCodeList : [],

	// 메세지 알림 콜백 Function 정보 저장
	CB_FUNCTION_MANAGER : {
		cbFuncIdx : 0, // 정보 저장 Index Key
		cbFuncSave : {} // 정보 저장 객체
	},
	
	// 파일 다운로드 URL
	FILE_DOWNLOAD_URL : "/file/downloadFile/",
	
	// 웹 브라우저 단축키가 동작하지 않도록 설정함 (true : 동작, false : 미동작)
	IS_USE_BROWSER_SHORTCUT : true,
	
	// GET Method에 대해서 RESTFul 방식으로 URL 생성되도록 하는 옵션 (true : 동작, false : 미동작)
	// RESTFul URL 생성 규칙에 관한 자세한 설명은 gcm.sbm.setActionParam 함수의 주석 참조
	IS_RESTFUL_URL : true, 
	
	// Console Log Debugg 설정 (DEBUG_MODE가 false이면 Console 객체를 통해서 남긴 로그가 개발자 도구 Console 창에 남지 않도록 함 
	DEBUG_MODE : true
};


// =============================================================================
/**
 * 화면 제어와 관련된 함수를 작성한다.
 *
 * @author Inswave Systems
 * @class win
 * @namespace gcm.win
 */
// =============================================================================
gcm.win = {};

/**
 * 다국어 처리함수
 * 
 * @date 2016.08.02
 * @private
 * @param {String} xmlUrl 전체 URL중 w2xPath이하의 경로
 * @memberOf gcm.win
 * @author InswaveSystems
 * @example 
 * gcm.getI18NUrl( "/ui/SW/request.xml" ); 
 * //return 예시)"/websquare/I18N?w2xPath=/ui/SW/request.xml"
 */
gcm.win.getI18NUrl = function(xmlUrl) {
	var baseURL = gcm.CONTEXT_PATH + "/I18N";
	var rsUrl = "";
	var locale = WebSquare.cookie.getCookie("locale");
	var bXml = "/blank.xml";
	
	xmlUrl = gcm.util.getParameter("w2xPath", xmlUrl) || xmlUrl;
	xmlUrl = xmlUrl.replace(/\?.*/, "");
	
	if (xmlUrl.search(bXml) > -1 && xmlUrl.search(WebSquare.baseURI) == -1) {
		xmlUrl = WebSquare.baseURI + "/blank.xml";
	}
	rsURL = baseURL + "?w2xPath=" + xmlUrl;

	if (locale != null && locale != '') {
		rsURL = rsURL + "&locale=" + unescape(locale);
	}

	return rsURL;
};


/**
 * 특정 컴포넌트가 속한 WFrame Scope을 반환한다.
 *
 * @param {Object} 컴포넌트 객체 또는 아이디(WFrame Scope 경로를 포함한 Full Path Id)
 * @memberOf gcm.win
 * @date 2020.05.16
 * @author Inswave Systems
 * @return {Object} Scope 객체
 */
gcm.win.getScope = function(comObj) {
	try {
		if (typeof comObj === "string") {
			var scopeObj = com.util.getComponent(comObj);
			if (scopeObj !== null) {
				return scopeObj.getScopeWindow();
			}
		} else {
			return comObj.getScopeWindow();
		}
	} catch (ex) {
		console.error(ex);
		return null;
	}
};

/**
 * 현재 활성화된 실행 프레임 정보를 윈도우를 반환한다.
 * 
 * @date 2019.03.13
 * @memberOf com.win
 * @author InswaveSystems
 * @returns {Object} 현재 Active Window 정보 반환
 * @returns {String} activeinfo.type : 액티브 윈도우 타입 [P : 팝업, T: 탭컨텐츠, W: 윈도우컴포넌트]
 * @returns {Object} activeinfo.window : 액티브 윈도우 객체
 * @returns {String} activeinfo.programCd : 액티브 윈도우 프로그램 코드
 */
gcm.win.getActiveWindowInfo = function() {
	var activeInfo = {
		"type" : "", // T:Tabcontrol, W:windowContainer, P:popup
		"window" : "", // Window객체
		"programCd" : "" // 프로그램 코드 (팝업인경우는 예외)
	};

	var popupList = $p.getPopupWindowList();
	var popupWindow = null;

	if (popupList.length > 0) {
		for (var i = popupList.length - 1; i > -1; i--) {
			if (document.activeElement.id + "_wframe" === popupList[i].$p.getFrameId()) {
				popupWindow = $p.getPopupWindow(document.activeElement.id);
			}
		}
	} 
	
	if (popupWindow !== null) {
		// WFrame Popup 방식으로 오픈된 팝업 화면
		activeInfo["type"] = "P";
		activeInfo["programCd"] = popupWindow.$p.getMetaValue("meta_programId");
		activeInfo["window"] = popupWindow;
	} else if (typeof $p.top().scwin.getLayoutId === "function") {
		// TabControl 또는 WindowContainer를 통해서 오픈된 업무 화면
		activeInfo["type"] = $p.top().scwin.getLayoutId();
		if (activeInfo["type"] == "T") {
			var selectedTabId = $p.top().tac_layout.getSelectedTabID();
			var findProgramList = gcm.menuComp.getMatchedJSON("MENU_CD", selectedTabId, true);
			if (findProgramList.length > 0) {
				activeInfo["programCd"] = findProgramList[0].PROGRAM_CD;
			}
			activeInfo["window"] = $p.top().tac_layout.getWindow(selectedTabId);
		} else if (activeInfo["type"] == "M") {
			var selectedWindowId = $p.top().wdc_main.getSelectedWindowId();
			var findProgramList = gcm.menuComp.getMatchedJSON("MENU_CD", selectedWindowId, true);
			if (findProgramList.length > 0) {
				activeInfo["programCd"] = findProgramList[0].PROGRAM_CD;
			}
			activeInfo["window"] = $p.top().wdc_main.getWindow(selectedWindowId);
		} else if (activeInfo["type"] == "S") {
			if (!com.util.isEmpty($p.top().wfm_layout.getWindow().com.data.getParameter("menuInfo").programCd)) {
				activeInfo["programCd"] = $p.top().wfm_layout.getWindow().com.data.getParameter("menuInfo").programCd;
			}
			activeInfo["window"] = $p.top().wfm_layout.getWindow();
		}
	} else {
		// Window Popup 방식으로 오픈된 팝업 화면
		activeInfo["type"] = "P";
		activeInfo["programCd"] = $p.getMetaValue("meta_programId");
		activeInfo["window"] = $p.getFrame();
	}

	return activeInfo;
};


/**
 * 토스트 메시지를 보여준다.
 *
 * @memberOf com.win
 * @date 2021.03.11
 * @param {String} 메시지 종류 ( 에러 : gcm.MESSAGE_CODE.STATUS_ERROR, 성공 : gcm.MESSAGE_CODE.STATUS_SUCCESS, 경고 : gcm.MESSAGE_CODE.STATUS_WARNING, 정보 : gcm.MESSAGE_CODE.STATUS_INFO )
 * @param {String} 메시지
 * @author Inswave Systems
 * @example
gcm.win.showToastMessage(gcm.MESSAGE_CODE.STATUS_SUCCESS, e.responseJSON.rsMsg.statusMsg);
 */
gcm.win.showToastMessage = function(messageType, message) {
	if (com.util.isEmpty($p.top().wfm_footer)) {
		return;
	}
	
	var wfmFooter = $p.top().wfm_footer.getWindow();
	var className = "";
	
	if (gcm.MESSAGE_CODE.STATUS_ERROR === messageType) {
		className = "error";
	} else if (gcm.MESSAGE_CODE.STATUS_SUCCESS === messageType) {
		className = "success";
	} else if (gcm.MESSAGE_CODE.STATUS_WARNING === messageType) {
		className = "warning";
	} else {
		className = "info";
	}
	
	wfmFooter.$p.dynamicCreate("grp_notice" + gcm.MESSAGE_IDX, "group", { style: "opacity: 0.0" }, wfmFooter.grp_noticeArea);
	var grpNotice = wfmFooter.$p.getComponentById("grp_notice" + gcm.MESSAGE_IDX);
	grpNotice.addClass("notice");
	
	wfmFooter.$p.dynamicCreate("grp_noticeInfo" + gcm.MESSAGE_IDX, "group", { style: "opacity: 0.0" }, grpNotice);
	var grpNoticeInfo = wfmFooter.$p.getComponentById("grp_noticeInfo" + gcm.MESSAGE_IDX);
	grpNoticeInfo.addClass(className);
	
	wfmFooter.$p.dynamicCreate("tbx_message" + gcm.MESSAGE_IDX, "textbox", { style: "display:inline; margin-left:3px", label : message}, grpNoticeInfo);

	$("#" + grpNotice.getID()).fadeTo(1000, 1);
	$("#" + grpNoticeInfo.getID()).fadeTo(1000, 1);
	
	com.util.setTimeout(
		function(idx) {
			var grpNotice = wfmFooter.$p.getComponentById("grp_notice" + idx);
			if (!com.util.isEmpty(grpNotice)) {
				$("#" + grpNotice.getID()).fadeTo(1000, 0);
			}
			
			var grpNoticeInfo = wfmFooter.$p.getComponentById("grp_noticeInfo" + idx);
			if (!com.util.isEmpty(grpNoticeInfo)) {
				$("#" + grpNoticeInfo.getID()).fadeTo(1000, 0);
			}

			com.util.setTimeout(
				function(idx) {
					var tbxMessage = wfmFooter.$p.getComponentById("tbx_message" + idx);
					if (!com.util.isEmpty(tbxMessage)) {
						tbxMessage.remove();
					}
					
					var grpNoticeInfo = wfmFooter.$p.getComponentById("grp_noticeInfo" + idx);
					if (!com.util.isEmpty(grpNoticeInfo)) {
						grpNoticeInfo.remove();
					}
					
					var grpNotice = wfmFooter.$p.getComponentById("grp_notice" + idx);
					if (!com.util.isEmpty(grpNotice)) {
						grpNotice.remove();
					}
					
					var objArr = com.util.getChildren(wfmFooter.grp_noticeArea, {
						includePlugin: "group textbox",
						recursive: true
					});
				},
				{ delay : 1500, args : [idx], key :"MessageRemove" + idx}	
			);

		},
		{ delay : 3000, args : [gcm.MESSAGE_IDX], key : "MessageFadeOut" + gcm.MESSAGE_IDX}
	);	
	
	gcm.MESSAGE_IDX++;
};


/**
 * 현재 메뉴의 권한 정보를 가져온다
 * @date 2022.02.06
 * @author 권영택
 * @example
 * 
 * let auth = gcm.win.getCurrMenuAuth();
 * console.log( auth );
 */
gcm.win.getCurrMenuAuth = function() {
	if(!gcm.menuComp || !gcm.programAuthorityComp) {
		return false;
	}
	
	let menuCd = $w.getParameter("menuCd");
	
	let matchedMenuList = gcm.menuComp.getMatchedJSON('MENU_CD', menuCd);
	let menu = matchedMenuList && matchedMenuList.length && matchedMenuList[0] || false;
	
	let matchedAuthList = gcm.programAuthorityComp.getMatchedJSON('PROGRAM_CD', menu && menu.PROGRAM_CD || '');
	let auth = matchedAuthList && matchedAuthList.length && matchedAuthList[0] || false;
	
	return auth;
};

/**
 * 현재 메뉴의 권한 정보 기반으로, 버튼을 가린다.
 * @date 2022.02.06
 * @author 권영택
 * @example
 * 
 * let auth = gcm.win.authInit();
 */
gcm.win.authInit = function() {
	let auth = gcm.win.getCurrMenuAuth();
	
	if(!auth) {
		return false;
	}
	
	let isAuthSelect = auth.IS_AUTH_SELECT == 'Y';
	let isAuthSave = auth.IS_AUTH_SAVE == 'Y';
	let isAuthExcel = auth.IS_AUTH_EXCEL == 'Y';
	
	//검색 버튼 및 검색 박스
	$('.tabc_layout .btn_cm.sch').css('display', isAuthSelect ? 'inline-block' : 'none');
	$('.tabc_layout .shbox').css('display', isAuthSelect ? 'block' : 'none');
	
	//등록, 취소, 저장 버튼
	$('.tabc_layout .btn_cm:not(.sch, .xls_down)').css('display', isAuthSave ? 'inline-block' : 'none');
	
	//엑셀 다운로드 버튼
	$('.tabc_layout .btn_cm.xls_down').css('display', isAuthExcel ? 'inline-block' : 'none');
};



/**
 * 특정 메뉴를 오픈한다.
 * @date 2021.02.16
 * @param {String} menuNm 메뉴명 - 단위화면에서 해당 값으로 title을 설정한다.
 * @param {String} url 화면 파일 경로
 * @param {String} menuCode 메뉴코드 - DB에 저장되어있는 메뉴 코드
 * @param {Object} data 화면에 전달할 JSON 데이터 객체
 * @param {Object} option 화면 오픈 옵션
 * @param {String} option.menuType 메뉴타입 ("SP" : 샘플화면)
 * @param {String} option.closable 닫기버튼 보여주기 여부
 * @param {Boolean} option.isHistory Browser History에 기록할 지 여부 (true, false)
 * @author Inswave Systems
 * @example
 * 
 * gcm.win.openMenu("인사조회","/tmp/tmp01.xml","010001");
 */
gcm.win.openMenu = function($p, menuNm, url, menuCode, paramObj, option) { 
	// client에서 url 숨기기 메뉴일 경우에는 새 창으로 띄우기 적용 
	if (com.util.isEmpty(url)) {
		com.win.alert("메뉴에 프로그램이 등록되지 않았습니다.");
	} if (url == "/") {
		var url = document.location.href + "/";
		window.open(url, "", "width=1200, height=700, left=450, top=100");
	} else {
		menuCode = menuCode || "";
		var layout = $p.top().scwin.getLayoutId();
		var tmpUrl;
		var menuCodeParm = menuCode;
		var frameMode;
		var data = {};
		var closable = true;

		if (url.indexOf("/") !== 0) {
			url = "/" + url;
		}
		url = gcm.CONTEXT_PATH + url;

		if ((typeof paramObj !== "undefined") && (paramObj !== null)) {
			data.param = paramObj;
		}
		
		data.menuInfo = {
			menuNm : menuNm,
			menuCode : menuCode,
			src : url
		};
		
		if (!com.util.isEmpty(option) && !com.util.isEmpty(option.menuType)) {
			data.menuInfo.menuType = option.menuType;
		}
		
		
		if (!com.util.isEmpty(option) && !com.util.isEmpty(option.closable)) {
			closable = option.closable;
		}
		
		var frameMode = "";

		if (layout == "T") {
			var tabObj = { 
				closable : closable, //탭 닫기 기능 제공
				openAction : "select", // exist 는 기존 탭을 갱신, new 는 항상 새로, select는 동일 id 가 존재하면 선택, last: 기존 tab을 마지막 tab으로 이동후 선택
				label : menuNm 
			};
			
			var contObj = {
				frameMode : "wframePreload",
				scope : true,
				src : url,
				alwaysDraw : false,
				title : menuNm,
				dataObject : { 
					type : "json", 
					name : "paramData", 
					data : data
				}
			};
			
			$p.top().tac_layout.addTab(menuCode, tabObj, contObj);

			// tabObj의 openAction의 last값의 동작 특이 사항으로 선택이 되지 않은 경우 선택하는 로직 추가
			if ($p.top().tac_layout.getSelectedTabID() !== menuCode) {
				var tabIndex = $p.top().tac_layout.getTabIndex(menuCode);
				if (tabIndex) {
					$p.top().tac_layout.setSelectedTabIndex(tabIndex);
				}
			}
			
			// history에 화면 전환했던 프로그램 코드 저장
			if (!com.util.isEmpty(option) && option.isHistory && !com.util.isEmpty(menuCode)) {
				gcm.win.pushState(data);
			}
			
		} else if (layout == "M") {
			var options = {
				title : menuNm,
				src : url,
				windowTitle : menuNm,
				windowId : menuCode,
				openAction : "selectWindow",
				frameMode : "wframe",
				fixed : (option.closable == false) ? true : false,
				closeAction : function(title) { 
					if (title === "메인") {
						return false;
					} else {
						var winFrame = $p.top().wdc_main.getWindowByUniqueId(this.id).scwin.$w.getFrame();
						return $p.top().scwin.closeBeforePage(winFrame);;
					}
				},
				dataObject : { 
					type : "json", 
					name : "paramData", 
					data : data
				}
			}
			$p.top().wdc_main.createWindow(options);
			
			// history에 화면 전환했던 프로그램 코드 저장
			if (!com.util.isEmpty(option) && option.isHistory && !com.util.isEmpty(menuCode)) {
				gcm.win.pushState(data);
			}
		} else if(layout == "S") {
			var programCd = $p.top().wfm_side.getWindow().dlt_menu.getMatchedColumnData("SRC_PATH", url, "PROGRAM_CD");
			data.menuInfo.programCd = programCd[0];
			
			// history에 화면 전환했던 프로그램 코드 저장
			if (!com.util.isEmpty(option) && option.isHistory && !com.util.isEmpty(menuCode)) {
				gcm.win.pushState(data);
			}
			
			var param = {
				dataObject : {
					type : "json",
					name : "paramData",
					data : data
				}
			};
			$p.top().wfm_layout.setSrc(url, param);
		}
	}
};


/**
*
* 팝업창을 연다.
*
* @param {String} url url 화면경로
* @param {Array} options Popup창 옵션
* @param {String} options.id] Popup창 아이디
* @param {String} options.type] 화면 오픈 타입 ("wframePopup", "browserPopup")
* @param {String} options.width] Popup창 넓이
* @param {String} options.height] Popup창 높이
* @param {String} options.popupName] useIframe : true시 popup 객체의 이름으로 popup 프레임의 표시줄에 나타납니다.
* @param {String} options.useIFrame] [default : false] true : IFrame 을 사용하는 WebSquare popup / false: window.open 을 사용하는 popup
* @param {String} options.style] Popup의 스타일을 지정합니다. 값이 있으면 left top width height는 적용되지 않습니다.
* @param {String} options.resizable] [default : false]
* @param {String} options.modal] [default : false]
* @param {String} options.scrollbars] [default : false]
* @param {String} options.title] [default : false]
* @param {String} options.notMinSize [default : false]
* @param {Object} data 팝업 화면에 전달할 데이터 객체 (type이 wframePopup인 경우만 지원)
* @memberOf gcm.win
* @date 2020.05.16
* @author Inswave Systems
*/
gcm.win.openPopup = function($p, url, opt, data) {
	var com = gcm.util.getObject($p, "com");
	
	var _dataObj = {
		type : "json",
		data : data,
		name : "paramData"
	};
	
	var width = opt.width || 500;
	var height = opt.height || 500;
	
	try {
		var deviceWidth = parseFloat($("body").css("width"));
		var deviceHeight = parseFloat($("body").css("height"));

		if (!opt.notMinSize) {
			var borderSize = 4;
			if(opt.type != "browserPopup"){
				borderSize = 4
				if (deviceWidth > 0 && width > deviceWidth) {
					width = deviceWidth - borderSize; // 팝업 border 고려
				}

				if (deviceHeight > 0 && height > deviceHeight) {
					height = deviceHeight - borderSize; // 팝업 border 고려
				}

			} else {
				if (window.screen.availHeight <= height) {
					height = window.screen.availHeight-100;
				}
			}
		}
	} catch (ex) {
		console.error(ex);
	}
	
	opt.type = opt.type || "wframePopup";

	if (opt.type == "browserPopup") {
		var top = Math.floor(((window.screen.availHeight- 50 - com.num.parseInt(height)))/ 2) + (window.screen.availTop|| 0) + "px";
		var left = Math.floor((window.screen.availWidth - com.num.parseInt(width)) / 2) + (window.screen.availLeft || 0 ) + "px";
	} else {
		var top = ((document.body.offsetHeight / 2) - (com.num.parseInt(height) / 2) + $(document).scrollTop()) + "px";
		var left = ((document.body.offsetWidth / 2) - (com.num.parseInt(width) / 2) + $(document).scrollLeft()) + "px";
	}

	if (typeof _dataObj.data !== "undefined") {
		if (typeof _dataObj.data.callbackFn == "function") {
			var cbFuncIdx = ++gcm.CB_FUNCTION_MANAGER["cbFuncIdx"];
			var idx = "__close_callback_Func__" + new Date().getTime() + "_" + cbFuncIdx;
			gcm.CB_FUNCTION_MANAGER["cbFuncSave"][$p.id + idx] = _dataObj.data.callbackFn;
			_dataObj.data.callbackFn = $p.id + idx;
		} else if (typeof _dataObj.data.callbackFn === "undefined") {
			_dataObj.data.callbackFn = "";
		} else if (typeof _dataObj.data.callbackFn === "string") {
			_dataObj.data.callbackFn = $p.id + _dataObj.data.callbackFn;
		}
	}
	
	var paramUrl = "";

	if ((opt.type !== "wframePopup") && (com.util.isEmpty(_dataObj.data) === false)) {
		paramUrl = "&" + _dataObj.name + "=" + WebSquare.text.BASE64Encode(com.str.serialize(_dataObj.data)) ;
	}

	var options = {
		id : opt.id,
		popupName : opt.popupName || "",
		type : opt.type || "wframePopup",
		width : width + "px",
		height : height + "px",
		top : opt.top || top || "140px",
		left : opt.left || left || "500px",
		modal : (opt.modal == false) ? false : true,
		dataObject : _dataObj,
		alwaysOnTop : opt.alwaysOnTop || false,
		useModalStack : (opt.useModalStack == false) ? false : true,
		resizable : (opt.resizable == false) ? false : true,
		useMaximize : opt.useMaximize || false,
		className :opt.className || "",
		scrollbars : true,
		closeAction : function() {
			var com = $p.getPopupWindow(this.id).com;
			var messageType = com.data.getParameter("messageType") || "alert";
			var callbackFuncStr = com.data.getParameter("callbackFn");
			var callbackFunc = gcm.util.getCallBackFunction(callbackFuncStr);
			
			if (typeof callbackFunc === "function") {
				if (!com.util.isEmpty(com.win.popup) && !com.util.isEmpty(com.win.popup.callbackParam)) {
					callbackFunc(com.util.getJSON(com.win.popup.callbackParam));
				} else {
					if (messageType === "confirm") {
						callbackFunc({ clickValue : false });
					} 
				}
			}
			return true
		},
		popupUrl : "../popup"
	};
	
	if (options.type !== "wframePopup") {
		$p.openPopup(url + paramUrl, options);
	} else {
		$p.openPopup(gcm.CONTEXT_PATH + url + paramUrl, options);
	}
};


/**
 * 팝업창을 닫는다.
 *
 * @memberOf gcm.win
 * @date 2020.05.16
 * @param {String} popId popup창 id로 값이 없을 경우 현재창의 아이디
 * @param {String|Object} 부모 창에 전달한 데이터
 * @author Inswave Systems
 */
gcm.win.closePopup = function($p, popId) {
	var com = gcm.util.getObject($p, "com");
	
	com.util.setTimeout(
		function() { 
			if ($p.isWFramePopup()) {
				$p.closePopup(popId);
			} else {
				$w.closePopup();
			}
		},
		{ delay : 10, key : "closePopup" + (Math.random() * 16).toString().replace(".","") }
	);
};

/**
 * 메세지 팝업을 호출한다.
 *
 * @private
 * @param {String} messageType 팝업창 타입 (alert || confirm)
 * @param {String} messageStr 메시지
 * @param {String} closeCallbackFncName 콜백 함수명
 * @param {String} title 팝업창 타이틀
 * @memberOf gcm.win
 * @date 2020.05.16
 * @author Inswave Systems
 * @example
//alert창을 띄울 경우
scwin.callback = function(){
	console.log("콜백 함수입니다.");
};
gcm.win.messagBox($p, "alert", "보낼 메시지", "callback");

//confirm창을 띄울 경우
scwin.callback = function(){
	console.log("콜백 함수입니다.");
};
gcm.win.messagBox($p, "confirm", "보낼 메시지", "callback");
 */
gcm.win.messagBox = function($p, messageType, messageStr, closeCallbackFncName, opts) {
	var com = gcm.util.getObject($p, "com");
	var messageStr = messageStr || "";
	var messageType = messageType || "alert";
	var popId = messageType || "Tmp";

	popId = popId + (Math.random() * 16).toString().replace(".","");

	if (typeof opts.callBackParam !=="object") {
		opts.callBackParam = {};
	}

	if (com.util.isArray(messageStr)) {
		var sysMsg = com.data.getMessage(messageStr);
		if (typeof sysMsg === "string" &&  sysMsg !="") {
			messageStr = sysMsg;
		} else {
			messageStr = "";
		}
	} else {
		var sysMsg = com.data.getMessage(messageStr);
		if (typeof sysMsg === "string" && com.util.isEmpty(sysMsg) === false) {
			messageStr = sysMsg;
		}
	}

	var data = {
		"message": messageStr,
		"callbackFn": closeCallbackFncName,
		"messageType": messageType,
		"id": popId,
		"callBackParam" : opts.callBackParam
	};

	var options = {
		id: popId,
		popupName: messageType == "alert" ? com.data.getMessage("MSG_CM_00046") : com.data.getMessage("MSG_CM_00047"),
		width: 380,
		height: 223,
		className : "messagebox"
	};

	com.win.openPopup("/cm/xml/messageBox.xml", options, data);
};


/**
 * 사용자의 권한에 따른 화면 컴포넌트 제어를 한다.
 *
 * @private
 * @memberOf gcm.win
 * @date 2020.05.26
 * @author Inswave Systems
 */
gcm.win.setProgramAuthority = function($p) {
	var param = com.data.getParameter();
	if ((typeof param !== "undefined") && (typeof param.menuCode !== "undefined") && (param.menuCode.trim() !== "")) {
		var menuCd = param.menuCode;
		var menuInfoList = $p.top().wfm_side.getWindow().dlt_menu.getMatchedJSON("MENU_CD", menuCd);

		if (menuInfoList.length > 0) {
			var programAuthorityList = $p.top().wfm_side.getWindow().dlt_programAuthority.getMatchedJSON("PROGRAM_CD", menuInfoList[0].PROGRAM_CD);

			if (programAuthorityList.length > 0) {
				var programAuthority = programAuthorityList[0];
				var objArr = com.util.getChildren($p.getFrame(), {
					excludePlugin : "group textbox output calendar image span",
					recursive : true
				});

				for (var i = 0; i < objArr.length; i++) {
					if ((objArr[i].getPluginName() === "anchor") || (objArr[i].getPluginName() === "trigger")) {
						if (objArr[i].getOriginalID().indexOf("btn_search") > -1) {
							if (programAuthority.IS_AUTH_SELECT !== "Y") {
								objArr[i].hide();
							}
						} else if (objArr[i].getOriginalID().indexOf("btn_add") > -1) {
							if (programAuthority.IS_AUTH_SAVE !== "Y") {
								objArr[i].hide();
							}
						} else if (objArr[i].getOriginalID().indexOf("btn_cancel") > -1) {
							if (programAuthority.IS_AUTH_SAVE !== "Y") {
								objArr[i].hide();
							}
						} else if (objArr[i].getOriginalID().indexOf("btn_save") > -1) {
							if (programAuthority.IS_AUTH_SAVE !== "Y") {
								objArr[i].hide();
							}
						} else if (objArr[i].getOriginalID().indexOf("btn_excel") > -1) {
							if (programAuthority.IS_AUTH_EXCEL !== "Y") {
								objArr[i].hide();
							}
						}
					}
				}
			}
		}
	}
};


/**
 * 공통 코드, 권한, 개인화 처리를 위한 Workflow를 실행한다.
 *
 * @private
 * @memberOf gcm.win
 * @date 2020.05.27
 * @author Inswave Systems
 */
gcm.win.processCommonData = function($p) {
	var com = gcm.util.getObject($p, "com");
	var scwin = gcm.util.getObject($p, "scwin");
	
	var commonDataWorkflow = {
		"id" : "wkf_commonDataWorkflow",
		"processMsg" : "",
		"step" : [],
		"resolveCallback" : "",
		"rejectCallback" : ""
	};
	
	if (typeof scwin.ondataload === "function") {
		commonDataWorkflow["resolveCallback"] = scwin.ondataload;
	}

	var sbmSearchCode = com.util.getComponent("_sbm_searchCode");

	if (com.util.isEmpty(sbmSearchCode) === false) {
		commonDataWorkflow.step = [
			{ "type" : "submit", "action" : "_sbm_searchCode" },
			{ "type" : "submitDone", "action" : "_sbm_searchCode" }
		];
	}
	
	var sbmSelectShortcutList = com.util.getComponent("_sbm_selectShortcutList");
	
	if (com.util.isEmpty(sbmSelectShortcutList) === false) {
		commonDataWorkflow.step.push({ "type" : "submit", "action" : "_sbm_selectShortcutList" });
		commonDataWorkflow.step.push({ "type" : "submitDone", "action" : "_sbm_selectShortcutList" });
	}

	if (commonDataWorkflow.step.length > 0) {
		com.sbm.executeWorkflow(commonDataWorkflow);
	} else {
		if (typeof scwin.ondataload === "function") {
			scwin.ondataload();
		}
	}
};


/**
 * 브라우저 Back, Forward 발생 시 onPopState 이벤트를 등록한다.
 *
 * @memberOf gcm.win
 * @date 2021.07.08
 * @author Inswave Systems
 * @example gcm.win._setHistoryBackEvent();
 */
gcm.win.setHistoryBackEvent = function() {
	if (window.addEventListener) {
		window.addEventListener("popstate", gcm.win.changePageState);
	} else {
		window.attachEvent("popstate", gcm.win.changePageState);
	}
};


/**
 * history.pushState API를 호출해서 브라우저에서 History 상태를 기록한다.
 *
 * @memberOf gcm.win
 * @date 2021.07.08
 * @author Inswave Systems
 * @example
gcm.win.pushState(option.dataObject.data);
 */
gcm.win.pushState = function(data) {
	if (data.menuInfo.menuCode === "MAIN") {
		history.pushState({ "data" : data }, data.menuInfo.menuNm, "");
	} else {
		history.pushState({ "data" : data }, data.menuInfo.menuNm, "?menuCd=" + data.menuInfo.menuCode);
	}
	
};


/**
 * 브라우저 Back, Forward 발생 시 onPopState 이벤트 처리를 수행한다.
 *
 * @memberOf gcm.win
 * @date 2021.07.08
 * @author Inswave Systems
 * @example 
gcm.win.changePageState();
 */
gcm.win.changePageState = function() {
	if(!com.util.isEmpty(history.state) && !com.util.isEmpty(history.state.data) && !com.util.isEmpty(history.state.data.menuInfo)){
		var options = {};
		options.isHistory = false;
		var data = history.state.data;
		$p.top().wfm_side.getWindow().trv_menu.findNodeByValue(data.menuInfo.menuCode, true);
		gcm.win.openMenu($p.top().$p, data.menuInfo.menuNm, data.menuInfo.src, data.menuInfo.menuCode, data.param, options);
	}
};


/**
 * Window.onBeforeUnload 이벤트를 추가한다.
 *
 * @memberOf gcm.win
 * @date 2021.07.08
 * @author Inswave Systems
 * @example 
 * gcm.win.addEventOnBeforeUnload();
 */
gcm.win.addEventOnBeforeUnload = function() {
	if (window.addEventListener) {
		window.addEventListener("beforeunload", gcm.win.setOnBeforeUnload);
	} else {
		window.attachEvent("onbeforeunload", gcm.win.setOnBeforeUnload);
	}
};


/**
 * Window.onBeforeUnload 이벤트를 삭제한다.
 *
 * @memberOf gcm.win
 * @date 2021.07.08
 * @author Inswave Systems
 * @example 
 * gcm.win.removeEventOnBeforeUnload();
 */
gcm.win.removeEventOnBeforeUnload = function() {
	if (window.removeEventListener) {
		window.removeEventListener("beforeunload", gcm.win.setOnBeforeUnload);
	} else {
		window.detachEvent("onbeforeunload", gcm.win.setOnBeforeUnload);
	}
};


/**
 * Window.onBeforeUnload 이벤트 발생 시 페이지를 떠날 것인지 확인한다.
 *
 * @memberOf gcm.win
 * @date 2021.07.08
 * @author Inswave Systems
 * @example gcm.win._setOnBeforeUnload();
 */
gcm.win.setOnBeforeUnload = function(e) {
	event.preventDefault();
	event.returnValue = "You didn't save changes";
	return event.returnValue;
};


/**
 * 데이터가 수정되어있는 경우 창이 닫힐때 창을 닫을 지 여부르를 묻는 컨펌창을 호출한다.
 *
 * @private
 * @memberOf com.win
 * @date 2021.07.08
 * @param {Object} dataObjArr 창이 닫힐때 수정된 여부를 체크할 데이터컬렉션 객체(데이터 맵또는 데이터 리스트)
 * @return {Object} topFrame 객체
 * @author Inswave Systems
 * @example 
gcm.win.setBeforeCloseModified = function($p, dataObjArr);
 */
gcm.win.setBeforeCloseModified = function($p, dataObjArr) {
	var frameObj = com.win._getMenuTopFrame();
	var frameId = frameObj.id;
	var modifiedData = frameObj.getUserData(frameId + "_" + "ModifiedData");
	var dataIds = "";

	if (com.util.isEmpty(modifiedData)) {
		modifiedData = [];
	}

	if (com.util.isEmpty(dataObjArr)) {
		return;
	}

	modifiedData = modifiedData.concat(dataObjArr);
	frameObj.setUserData(frameId + "_" + "ModifiedData", modifiedData);

	// wframePopup팝업
	if ($p.isWFramePopup()) {
		$("#" + $p.getPopupId() + "_close").click(function() {
			var popupId = $p.getPopupId();
			var popupObj = $p.getPopup(popupId);
			popupObj.setCloseButtonStatus(false)

			if (gcm.win.beforeCloseModifiedCheck($p, frameId)) {
				var paramObj = {
					"popupId" : popupId
				};
				if (confirm(com.data.getMessage("com.cfm.0007") ||"창을 닫으시겠습니까? 변경사항이 저장되지 않을 수 있습니다")) {
					popupObj.close();
				}
				/*
				 * wframe confirm으로 바꿔야 하는 요구사항이 생기면 사용 var options ={ "callBackParam":paramObj, } com.win.confirm("창을 닫으시겠습니까? 변경사항이 저장되지 않을 수 있습니다",
				 * "com.win._popupCloseCallBack",options);
				 */
			} else {
				popupObj.close();
			}
		})
	} else if ($p.isPopup()) {
		// 윈도우팝업
		$(window).bind('beforeunload', function() {
			var popupObj = com.util.getComponent($p.getPopupId());
			if (gcm.win.beforeCloseModifiedCheck($p, frameId)) {
				return "창을 닫으시겠습니까? 변경사항이 저장되지 않을 수 있습니다";
			}
		});
	}
	return;
}

/**
 * 현재 화면의 데이터컬렉션중에 수정된 된 데이터가 있는지 확인한다. com.win.setBeforeCloseModified으로 등록한 데이터만 체크한다.
 *
 * @private
 * @memberOf com.win
 * @param {Object} frameId 프레임의 아이디
 * @return {Boolean} 수정된 데이터가 있으면 true 없으면 false 반환
 * @date 2021.07.08
 * @author Inswave Systems
 * @example
gcm.win.beforeCloseModifiedCheck(wfm_wframe);
 */
gcm.win.beforeCloseModifiedCheck = function($p, frameId) {
	var frameObj = com.util.getComponent(frameId);
	if (com.util.isEmpty(frameObj)) {
		return false;
	}

	var modifiedDataArr = frameObj.getUserData(frameId + "_" + "ModifiedData");

	if (!com.util.isEmpty(modifiedDataArr)) {
		if (com.util.isArray(modifiedDataArr) && com.util.isArray(modifiedDataArr) && modifiedDataArr.length > 0) {
			var uniqArr = modifiedDataArr.reduce(function(a, b) {
				if (a.indexOf(b) < 0)
					a.push(b);
				return a;
			}, []);
		}

		if (!com.util.isEmpty(uniqArr) && com.util.isArray(uniqArr)) {
			var uniqLen = uniqArr.length;
			if (uniqLen > 0) {
				for (var i = 0; i < uniqLen; i++) {
					var dlObj = uniqArr[i]
					if (!com.util.isEmpty(dlObj) && (dlObj.initializeType == "dataList" || dlObj.initializeType == "dataMap")) {
						var modifiedIndex = dlObj.getModifiedIndex();
						if (modifiedIndex.length > 0) {
							return true;
							break;
						}
					}
				}

			}
		}
		return false;
	} else {
		return false;
	}
};


/**
 * 웹스퀘이 페이지 호출 시 에러가 발생할 경우 발생하는 이벤트 함수
 * 
 * @private
 * @memberOf com.win
 * @date 2021.12.03
 * @author Inswave Systems
 */
gcm.win.errorHandler = function(e) {
	if (e.status == 404) {
		com.win.alert(e.responseURL + " URL이 존재하지 않습니다."); 
	}
};

/**
 * 전체 페이지 새로고침을 한다.
 * 
 * @memberOf com.win
 * @date 2021.10.07
 * @author Inswave Systems
 */
gcm.win.reload = function() {
	gcm.win.removeEventOnBeforeUnload();
	window.location.reload();
};

// =============================================================================
/**
 * Top 영역의 전역 DataCollection 및 전역 데이터 제어와 관련된 함수를 작성한다.
 *
 * @author Inswave Systems
 * @class data
 * @namespace gcm.data
 */
// =============================================================================

gcm.data = {};

/**
 * 유효성 검사 결과 메시지를 반환한다.
 *
 * @param {Object} valInfo 유효성 검사 옵션
 * @param {String} value 값
 * @param {Object} dataCollectionObj DataCollection 객체
 * @param {Number} rowIndex Row Index 값
 * @return {Object} msgInfo 유효성 검사 결과 메시지 정보 <br/>
msgInfo.msgType {String} 메시지 타입("1" : 기본 검사 항목, "2" : 사용자 정의 함수(valInfo) 검사 항목) <br/>
msgInfo.message {String} 검사 결과 메시지 내용
 * @memberOf gcm.data
 * @date 2020.05.16
 * @author Inswave Systems
 * @example
gcm.data.getValResultMsg(valInfo, value);
 */
gcm.data.getValResultMsg = function(valInfo, value, dataCollectionObj, rowIndex) {
	var msgInfo = { msgType : "1", message : "" };

	if ((typeof valInfo.mandatory !== "undefined") && (valInfo.mandatory === true) && (value.length === 0)) {
		msgInfo.message = "필수 입력 항목 입니다.";
	} else if ((typeof valInfo.minLength !== "undefined") && (valInfo.minLength > 0) && (value.length < valInfo.minLength)) {
		msgInfo.message = "최소 길이 " + valInfo.minLength + "자리 이상으로 입력해야 합니다.";
	} else if ((typeof valInfo.minByteLength !== "undefined") && (valInfo.minByteLength > 0) && (com.str.getByteLength(value) < valInfo.minByteLength)) {
		msgInfo.message = "최소 길이 " + valInfo.minByteLength + "자리 이상으로 입력해야 합니다.";
	} else if ((typeof valInfo.isEmail !== "undefined") && (valInfo.isEmail) && (com.util.isEmpty(value) === false) && (com.str.isEmail(value) === false)) {
		msgInfo.message = "유효한 이메일 주소가 아닙니다.";
	} else if ((typeof valInfo.isPhone !== "undefined") && (valInfo.isPhone) && (com.util.isEmpty(value) === false) && (com.str.isPhone(value) === false)) {
		msgInfo.message = "유효한 전화번호가 아닙니다.";
	} else if (typeof valInfo.valFunc === "function") {
		var resultMsg = valInfo.valFunc(value, dataCollectionObj, rowIndex);
		if (com.util.isEmpty(resultMsg) === false) {
			msgInfo.msgType = "2";
			msgInfo.message = resultMsg;
		}
	}

	return msgInfo;
};


/**
 * InputCalendar Validator를 수행한다.
 *
 * @param {String} value 입력된 날짜 문자열
 * @memberOf gcm.data
 * @date 2020.05.16
 * @author Inswave Systems
 */
gcm.data.validateInputCalendar = function(value, compId) {
	return value;
	try {
		var compObj = com.util.getComponent(compId);
		if (com.util.isEmpty(value) === false) {
			if (com.date.isDate(value) === false) {
				com.win.alert("날짜 형식이 올바르지 않습니다.");
			}
		}
		return value;
	} catch (ex) {
		return value;
	}
};


/**
 * 엑셀 다운로드 옵션을 설정한다.
 *
 * @date 2020.10.23
 * @param {Object} grdObj GridView Object
 * @param {Array} options JSON형태로 저장된 그리드의 엑셀 다운로드 옵션
 * @memberOf gcm.data
 * @author InswaveSystems
 * @example
gcm.data.setDownloadGridViewOption(grdObj, options);
 */
gcm.data.setDownloadGridViewOption = function(grdObj, options) {
	if (typeof options === "undefined") {
		options = {
			hiddenVisible : false
		}
	}

	var fileName = options.fileName;

	if (com.util.isEmpty(fileName)) {
		var dataCollectionId = com.data.getDataCollection(grdObj).id;
		if (com.util.isEmpty(dataCollectionId) === false) {
			fileName = dataCollectionId;
		} else {
			fileName = "excel_download";
		}
		
		if (options.fileType == undefined || options.fileType == "") {
			fileName = fileName + ".xlsx";
		} else {
			fileName = fileName + "." + options.fileType;
		}
		options.fileName = fileName;
	}

	fileName = fileName.toLowerCase();
	
	if (options.useProvider == "true") {
		options.dataProvider = "com.inswave.wrm.provider.ExcelDown";
	}
	if (options.useSplitProvider == "true") {
		options.splitProvider = "com.inswave.wrm.provider.ExcelSplitDown";
	}

	if (options.useProvider || options.useSplitProvider) {
		var colCnt = grdObj.getColumnCount();
		var columnsIDArr = new Array();

		for (var i = 0; i < colCnt; i++) {
			var isRemoveCol = false;
			if (typeof options.excludeColumns != "undefined" && options.excludeColumns != null && options.excludeColumns.length > 0) {
				for (var k = 0; k < options.excludeColumns.length; k++) {
					if (grdObj.getColumnID(i) == options.excludeColumns[k]) {
						isRemoveCol = true;
						break;
					}
				}
			}
			if (isRemoveCol) {
				continue;
			}
			columnsIDArr.push(grdObj.getColumnID(i));
		}

		var xmlDoc = WebSquare.xml.parse(options.providerRequestXml, false);
		WebSquare.xml.setValue(xmlDoc, "data/keyMap", columnsIDArr.join(","));
		options.providerRequestXml = WebSquare.xml.serialize(xmlDoc);
		delete options.useProvider;
		delete options.useSplitProvider;
	}
	
	// options.hiddenVisible=true 설정 시 화면내의 hidden컬럼을 removeColumns에 포함시켜서 엑셀 다운로드를 하지 않도록 한다.
	if ((typeof options.hiddenVisible === "undefined") || (options.hiddenVisible == false)) {
		var grdCnt = grdObj.getColCnt();

		var hiddenColIndex = [];
		for (var idx = 0; idx < grdCnt; idx++) {
			if (!grdObj.getColumnVisible(idx)) {
				hiddenColIndex.push(idx);
			}
		}

		if (hiddenColIndex.length > 0) {
			if ((typeof options.removeColumns !== "undefined") && (options.removeColumns.length > 0)) {
				options.removeColumns = options.removeColumns + "," + hiddenColIndex.join(',');
			} else {
				options.removeColumns = hiddenColIndex.join(',');
			}

			// 중복 요소 제거
			var _removeColumnArr = options.removeColumns.split(",");
			options.removeColumns = _removeColumnArr.reduce(function (a, b) {
				if (a.indexOf(b) < 0) {
					a.push(b);
				}
				return a;
			}, []).join(',');
		}
	}
};


/**
 * 다국어 메시지 데이터 배열을 전체조회 하여 전역객체 gcm.msg에 넣는다.
 *
 * @memberOf gcm.data
 * @date 2020.05.28
 * @author Inswave Systems
 * @example
gcm.data.loadMessage();
 */
gcm.data.loadMessage = function() {
	var lang = com.util.isEmpty(com.win.getLanguage()) ? "ko" : com.win.getLanguage();
	
	var getMessageOption = {
		id : "_sbm_getLanguagePack",
		action : "/message/getAllMessage/" + lang,
		method : "get",
		submitDoneHandler : function(e) {
			WebSquare.WebSquareLang = e.responseJSON.message;
		},
		isProcessMsg : false
	};
	
	com.sbm.executeDynamic(getMessageOption);
};

// =============================================================================
/**
 * 서비스 통신과 관련된 공통 로직 제어와 관련된 함수를 작성한다.
 *
 * config.xml에 정의된 Submission PreSubmit, CallSubmitFunc, ExnteralHandler 함수를 gcm.sbm 객체 아래에 작성한다.
 *
 * @author Inswave Systems
 * @class sbm
 * @namespace gcm.sbm
 */
// =============================================================================

gcm.sbm = {};

/**
 * submission의 공통 설정에서 사용.
 * submisison 통신 직전 호출.
 * return true일 경우 통신 수행, return false일 경우 통신 중단
 *
 * @param {Object} sbmObj 서브미션 객체
 * @memberOf gcm.sbm
 * @date 2020.05.16
 * @author Inswave Systems
 * @return {Boolean} true or false
 */
gcm.sbm.preSubmitFunction = function(sbmObj) {
	if ((com.util.isEmpty(gcm.CONTEXT_PATH) === false) && (sbmObj.action.indexOf(gcm.CONTEXT_PATH) !== 0)) {
		sbmObj.action = gcm.CONTEXT_PATH + sbmObj.action;
	}
	
	// REST API 방식 처리를 위해서 GET Method에 대해서 Request 데이터를 Path Variable 치환 및 QueryString으로 생성함
	if (gcm.IS_RESTFUL_URL === true) {
		gcm.sbm.setActionParam(sbmObj);
	}
};


/**
 * REST API 방식 처리를 위해서 GET Method에 대해서 Request 데이터를 Path Variable 치환 및 QueryString으로 생성한다.
 * 
 * 1. Path Variable 처리 : Action에서 "/testJsonMap/{procId}/{seq}/"와 같이 Path Variable(${procId}, ${seq})을 선언할 경우, 
 *    해당 변수를 DataMap이나 RequestData(JSON)에 정의된 Key의 Value으로 치환한다.
 *    DataMap이나 RequestData(JSON) 안에 Path Variable({procId}, {seq})에 정의된 procId와 seq Key(Column)이 존재해야 한다.
 *    Key가 존재하지 않을 경우 Path Variable에 추가하지 않는다.
 *    Path Variable에 추가된 Key 값은 GET 방식일 경우 생성되는 QueryString에서 제외 시킨다.
 *    
 * 2. QueryString 처리 : GET Method으로 Action을 호출할 경우, 해당 변수를 DataMap이나 RequestData(JSON)에 정의된 Key와 Value으로 치환한다.
 *    DataMap이나 RequestData(JSON) 안에 Path Variable({procId}, {seq})에 정의된 procId와 seq Key(Column)이 존재해야 한다.
 *    단 건 데이터(Map)만 QueryString으로 생성해서 서버에 전송하고, Array 형태의 데이터의 경우에는 QueryString으로 포함시키지 않는다.
 *    
 * @param {Object} sbmObj Submission 객체
 * @memberOf gcm.sbm
 * @date 2021.12.09
 * @author Inswave Systems
 * @example
// Submission ref 정의된 DataMap의 데이터를 QueryString 방식으로 URL에 추가해서 전달하는 예제 코드
// sbm_submission1.ref = "data:json,dma_dataMap1"
// sbm_submission1.action = "/restful/testJsonMap2"
// 생성된 Request URL : http://127.0.0.1:8080/restful/testJsonMap2.do?procId=PR001&subId=SB002&name=Peter&tel=010-2223-4421
scwin.btn_search1_onclick = function(e) {
	com.sbm.execute(sbm_submission1);
};

// JSON 객체를 QueryString 방식으로 URL에 추가해서 전달하는 예제 코드
// sbm_submission2.action = "/restful/testJsonMap2"
// 생성된 Request URL : http://127.0.0.1:8080/restful/testJsonMap2.do?procId=PR001&subId=SB002&name=Peter&tel=010-2223-4421
scwin.btn_search2_onclick = function(e) {
	var param = {
		procId : "PR001",
		subId : "SB002",
		name : "Peter",
		tel : "010-2223-4421"
	};
	com.sbm.execute(sbm_submission2, param);
};	

// ref 정의된 DataMap의 데이터를 Path Variable과 QueryString 방식을 조합해서 URL에 추가해서 전달하는 예제 코드
// DataMap 내에 정의된 Column Id 중에서 Path Variable로 정의되지 않은 컬럼(name, tel)을 QueryString 방식으로 추가된다.
// sbm_submission3.ref = "data:json,dma_dataMap1"
// sbm_submission3.action = "/restful/testJsonMap3/{procId}/{subId}"
// 생성된 Request URL : http://127.0.0.1:8080/restful/testJsonMap3/PR001/SB002?name=Peter&tel=010-2223-4421
scwin.btn_search3_onclick = function(e) {
	com.sbm.execute(sbm_submission3);
};
 */
gcm.sbm.setActionParam = function(sbmObj) {
	var requestData = sbmObj.requestData || WebSquare.ModelUtil.getRefToReqData(sbmObj);
	
	if (com.util.isEmpty(requestData)) {
		return;
	}
	
	if (typeof requestData === "string") {
		requestData = JSON.parse(requestData);
	}
	
	if (com.util.isEmpty(sbmObj.__action)) {
		sbmObj.__action = sbmObj.action;
	}
	
	var actionUrl = sbmObj.__action;
	
	var queryParam = {};
	if (sbmObj.__action.indexOf("/{") > -1) {
		actionUrl = actionUrl.substr(0, actionUrl.indexOf("/{"));
	}

	// requestData를 QueryString으로 생성해서 submission.action에 추가한다.
	if (com.util.isJSON(requestData)) {
		
		// DataMap에 저장된 데이터를 queryParam에 저장한다.
		for ( var key in requestData) {
			if ((com.util.isEmpty(requestData[key]) === false) && (com.util.isJSON(requestData[key]) === false)) {
				queryParam[key] = encodeURIComponent(requestData[key]);
			} else if ((com.util.isJSON(requestData[key])) && (com.util.isArray(requestData[key]) === false)) {
				for ( var subKey in requestData[key]) {
					if ((com.util.isEmpty(requestData[key][subKey]) === false) && (com.util.isJSON(requestData[key][subKey]) === false)) {
						queryParam[subKey] = encodeURIComponent(requestData[key][subKey]);
					}
				}
			}
		}
		
		
		
		// URL에 Path Variable(ex. {paramId})로 정의된 변수를 queryParam의 정의된 값으로 치환하고, queryParam에서는 제거한다.
		// queryParam에 Path Variable과 일치하는 값이 없을 경우 Skip한다.
		var actionArr = sbmObj.__action.split(/(\{[^}]*})/g);
		for (var i = 0; i < actionArr.length; i++) {
			if (actionArr[i].match(/(\{[^}]*})/g) !== null) {
				var paramKey = actionArr[i].substr(1, actionArr[i].indexOf("}")-1);
				if (typeof queryParam[paramKey] !== "undefined") {
					actionUrl += "/" + queryParam[paramKey];
					delete queryParam[paramKey];
				}
			}
		}
		
		// GET Method로 전송할 경우 queryParam에 저장된 Key, Value를 QueryString으로 생성해서 Action URL에 붙인다.
		if (sbmObj.method === "get") {
			for (key in queryParam) {
				if (actionUrl.indexOf("?") === -1) {
					actionUrl += "?" + key + "=" + queryParam[key];
				} else {
					actionUrl += "&" + key + "=" + queryParam[key];
				}
			}
		}
		
		sbmObj.action = actionUrl;
	}
};


/**
 * 모든 submission의 defaultCallback - gcm.sbm.submitErrorHandler 보다 먼저 수행됨. (400 Error) config.xml에 설정
 *
 * @param {Object} resObj responseData 객체
 * @param {Object} sbmObj Submission 객체
 * @memberOf gcm.sbm
 * @date 2020.05.16
 * @author Inswave Systems
 */
gcm.sbm.callbackSubmitFunction = function(resObj, sbmObj) {
	var scopeCom = gcm.win.getScope(sbmObj).com;

	// server와 연결을 할 수 없을 경우 responseStatusCode가 0으로 발생.
	if ((resObj.responseStatusCode < 100) || (resObj.responseStatusCode > 599)) {
		var detailStr = "HTTP STATUS INFO";
		detailStr += resObj.responseStatusCode;
		detailStr += " - URI:";
		detailStr += resObj.resourceUri;

		var msgObj = {
			statusCode : "E",
			errorCode : resObj.responseStatusCode,
			message : "서버와 연결할 수 없습니다. 자세한 내용은 관리자에게 문의하시기 바랍니다.",
			messageDetail : detailStr
		};

		scopeCom.sbm.resultMsg(msgObj);
		return false;
	}

	if (com.util.isEmpty(resObj.errorType) && typeof sbmObj._promise_submitDoneHandler === "function") {
		sbmObj._promise_submitDoneHandler(resObj);
	} else if (!com.util.isEmpty(resObj.errorType) && typeof sbmObj._promise_submitErrorHandler === "function") {
		sbmObj._promise_submitErrorHandler(resObj);
	}

	var rsJSON = resObj.responseJSON || null;
	if (rsJSON && rsJSON.rsMsg) {
		scopeCom.sbm.resultMsg(rsJSON.rsMsg);
	}
};

/**
 * submission중 에러가 발생한 경우 호출되는 함수 - 서버 오류(500 error)
 *
 * @param {Object} resObj responseData 객체
 * @memberOf gcm.sbm
 * @date 2020.05.16
 * @author Inswave Systems
 */
gcm.sbm.submitErrorHandler = function(resObj) {
	var scopeCom = gcm.win.getScope(resObj.id).com;

	var detailStr = "HTTP STATUS INFO";
	detailStr += resObj.responseReasonPhrase;
	detailStr += " ";
	detailStr += resObj.responseStatusCode;
	detailStr += "URI:";
	detailStr += resObj.resourceUri;
	detailStr += resObj.responseBody;

	var msgObj = {
		statusCode : "E",
		errorCode : "E9998",
		message : "서버 오류입니다. 자세한 내용은 관리자에게 문의하시기 바랍니다.",
		messageDetail : detailStr
	};

	scopeCom.sbm.resultMsg(msgObj);
};


// =============================================================================
/**
 * 웹스퀘어 컴포넌트 제어, 엑셀 파일 업로드/다운로드, 파일 업로드/다운로드, 기타 함수를 작성한다.
 *
 * @author Inswave Systems
 * @class util
 * @namespace gcm.util
 */
// =============================================================================

gcm.util = {};

/**
 * 접속한 사용자의 웹 브라우저 종류를 반환한다.
 *
 * @memberOf gcm.util
 * @date 2020.05.16
 * @return {String} 웹 브라우저 종류
 * @author  Inswave Systems
 * @example
var userAgent = gcm.util.getUserAgent();
 */
gcm.util.getUserAgent = function() {
	try {
		var agt = navigator.userAgent.toLowerCase();
		if (agt.indexOf("edg") != -1) {
			return 'Edge';
		} else if (agt.indexOf("chrome") != -1) {
			return 'Chrome';
		} else if (agt.indexOf("opera") != -1) {
			return 'Opera';
		} else if (agt.indexOf("staroffice") != -1) {
			return 'Star Office';
		} else if (agt.indexOf("webtv") != -1) {
			return 'WebTV';
		} else if (agt.indexOf("beonex") != -1) {
			return 'Beonex';
		} else if (agt.indexOf("chimera") != -1) {
			return 'Chimera';
		} else if (agt.indexOf("netpositive") != -1) {
			return 'NetPositive';
		} else if (agt.indexOf("phoenix") != -1) {
			return 'Phoenix';
		} else if (agt.indexOf("firefox") != -1) {
			return 'Firefox';
		} else if (agt.indexOf("safari") != -1) {
			return 'Safari';
		} else if (agt.indexOf("skipstone") != -1) {
			return 'SkipStone';
		} else if (agt.indexOf("msie") != -1 || agt.indexOf("trident") != -1) {
			return 'msie';
		} else if (agt.indexOf("netscape") != -1) {
			return 'Netscape';
		} else if (agt.indexOf("mozilla/5.0") != -1) {
			return 'Mozilla';
		} else {
			return '';
		}
	} catch (ex) {
		return '';
	}
};


/**
 * GET 방식으로 전달한 파라미터를 읽어 온다.
 *
 * @memberOf gcm.util
 * @date 2021.02.16
 * @param {String} param 파라미터 키
 * @param {String} url URL
 * @author Inswave Systems
 * @return {Object} 파라미터 값
 * @example
var codeValue = gcm.util.getParameter("code");  // 특정 파라미터 값을 얻어오기
 */
gcm.util.getParameter = function(param, url) {
	if (com.util.isEmpty(url)) {
		url = unescape(location.href);
	}
	var paramArr = (url.substring(url.indexOf("?")+1,url.length)).split("&");
	var value = "";

	for(var i = 0 ; i < paramArr.length ; i++) {
		var temp = paramArr[i].split("=");

		if(temp[0].toUpperCase() == param.toUpperCase()) {
			value = paramArr[i].split("=")[1];
			break;
		}
	}

	return value;
};


/**
 * 객체 아이디로 객체 찾아서 반환한다.
 * 
 * @memberOf gcm.util
 * @date 2021.07.27
 * @author Inswave Systems
 * @param {String} _objectId 객체 ID
 * @param {String} _scopeObj 객체 적용 Scope ID ["parent" 최상위 예외 scope ID 적용]
 * @returns {Object} 찾은 객체
 */
gcm.util.getObject = function($p, _objectId, _scopeObj) {
	var scopeObj = _scopeObj || "";
	var topFrameId = $p.top().$p.getFrameId();
	
	if (scopeObj == "parent") {
		scopeObj = $p.parent().$p;
	} else if (scopeObj == "top") {
		scopeObj = $p.top().$p;
	} else if (scopeObj == "") {
		scopeObj = $p;
	} else {
		var isComp = WebSquare.util.getComponentById(topFrameId + "_" + scopeObj);
		if (isComp) {
			scopeObj = isComp.getWindow().$p;
		}
	}

	var objectId = _objectId || "";
	var objectComp;
	
	try {
		if (objectId != "" && scopeObj && scopeObj.id && scopeObj.id.indexOf(topFrameId) == 0) {
			objectComp = scopeObj.getComponentById(objectId);
		} else if (objectId != "" && objectId.indexOf(topFrameId) == 0) {
			objectComp = WebSquare.util.getComponentById(objectId);
		}
		
		if (com.util.isEmpty(objectComp)) {
			objectComp = window[scopeObj.id + objectId];
		}
	} catch (ex) {
		console.error(ex);
	}
	return objectComp;
}

/**
 * 함수 명을 통해 함수 객체 찾아서 반환한다.
 * 
 * @memberOf gcm.util
 * @date 2021.07.27
 * @author Inswave Systems
 * @param {String} _funcStr 함수명
 * @param {String} _scopeId 함수 존재 scopeId [default: 현재 호출 scopeId (페이지)]
 * @returns {Function} 특정 함수명의 함수객체
 */
gcm.util.getFunction = function($p, _funcStr, _scopeId) {
	try {
		var fun;
		if (typeof _funcStr == "undefined") {
			return;
		} else {
			if (typeof _funcStr == "string") {
				var funcArr = _funcStr.split(".");
				var funcCnt = funcArr.length;
				var frameWin;
				if (typeof _scopeId != "" && typeof _scopeId != "undefined") {
					if (_scopeId == "top") {
						frameWin = $p.top();
					} else if (_scopeId == "parent") {
						frameWin = $p.parent();
					} else {
						var findObj = gcm.util.getObject($p, _scopeId, "top");
						if (findObj && typeof findObj.getWindow == "function") {
							frameWin = findObj.getWindow();
						} else {
							return;
						}
					}
				} else {
					frameWin = $p.getFrame().getWindow();
				}

				var targetObj = frameWin;
				while (funcCnt > 0) {
					var funcStr = funcArr[funcArr.length - funcCnt];
					var findFunc = targetObj[funcStr];
					if (typeof findFunc == "undefined") {
						break;
					} else {
						fun = findFunc;
						targetObj = fun;
						funcCnt--;
					}
				}

				if (typeof fun == "function") {
					return fun;
				}
			} else if (typeof _funcStr == "function") {
				return _funcStr;
			}
		}
	} catch (ex) {
		console.error(ex);
	}
};

/**
 * 콜백 함수 명을 통해 함수 객체 찾아서 반환한다.
 * 
 * @memberOf gcm.util
 * @date 2021.08.05
 * @author Inswave Systems
 * @param {String} callbackFnStr 함수명
 * @returns {Function} 특정 함수명의 함수객체
 */
gcm.util.getCallBackFunction = function(callbackFnStr) {
	if ((typeof callbackFnStr !== "undefined") && (callbackFnStr !== "")) {
		if (callbackFnStr.indexOf("__close_callback_Func__") > -1) {
			func = gcm.CB_FUNCTION_MANAGER["cbFuncSave"][callbackFnStr];
			delete gcm.CB_FUNCTION_MANAGER["cbFuncSave"][callbackFnStr];
			return func;
		} else {
			func = window.WebSquare.util.getGlobalFunction(callbackFnStr);
			return func;
		}
	}
};


// =============================================================================
/**
 * 단축키 관련 함수를 작성한다.
 *
 * @author Inswave Systems
 * @class hkey
 * @namespace gcm.hkey
 */
// =============================================================================

gcm.hkey = {}

/**
 * 단축키 이벤트 관리 객체를 정의한다.
 *
 * @memberOf gcm.hkey
 * @date 2019.03.13
 * @author  Inswave Systems
 */
gcm.hkey.event = {
	
	// 단축키 이벤트가 로딩 되었는지 여부 설정
	loadingEvent : "Y",
	
	/**
	 * KeyDown 이벤트
	 */
	keydownEvent : function(e) {
		if (gcm.hkey.event.loadingEvent == "Y") {
			gcm.hkey.event["checkEvent"].apply(this, [e]);
		}
	},
	
	/**
	 * 단축키 이벤트를 체크한다.
	 */
	checkEvent : function(e) { 
		try {
			var lastKey = e.key || e.keyCode || e.which;
			var complexKey = "";
			
			if (com.util.isEmpty(lastKey)) {
				return;
			}

			if (e.ctrlKey && e.altKey) {
				complexKey = "ctrlAltKey";
			} else if (e.ctrlKey && e.shiftKey) {
				complexKey = "ctrlShiftKey";
			} else if (e.altKey && e.shiftKey) {
				complexKey = "altShiftKey";
			} else {
				if (e.altKey) {
					complexKey = "altKey";
				} else if (e.ctrlKey) {
					complexKey = "ctrlKey";
				} else if (e.shiftKey) {
					complexKey = "shiftKey";
				} else {
					complexKey = "singleKey";
				}
			}

			// Ctrl, Alt, Shift가 아닌 lastKey가 인식될 경우
			if (lastKey != "Control" && lastKey != "Alt" && lastKey != "Shift") {
				
				// IE 브라우저에서 e.key 값이 정상적으로 로딩되지 안는 경우에 브라우저 단축키 처리
				if ((typeof lastKey === "number") || (lastKey === "Unidentified")) {
					if (e.keyCode >= 112 && e.keyCode <= 123) {
						var f_number = [ "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12" ];
						lastKey = f_number[e.keyCode - 112];
					} else if (e.keyCode == 9) {
						lastKey = "Tab";
					} else if (e.keyCode == 27) {
						lastKey = "Escape"; 
					} else if (e.keyCode == 187) {
						lastKey = "="; 
					} else if (e.keyCode == 189) {
						lastKey = "-"; 
					} else {
						lastKey = String.fromCharCode(e.keyCode).toUpperCase();
					}
				}
				
				if (gcm.hkey.event.isPreventKey(complexKey, lastKey)) {
					gcm.hkey.event.runEvent.apply(e, [complexKey, lastKey]);
					
					// 운영 환경에서 브라우저 단축키의 동작을 정지 시킴
					if (gcm.IS_USE_BROWSER_SHORTCUT === false) {
						
						// IE에서 F1 Key 동작 중지
						if ('onhelp' in window) {
							window.onhelp = function() {
								return false;
							}
						}
						
						if (e.preventDefault) {
							e.preventDefault();
						} else if (e.returnValue) {
							e.returnValue = false;
						}
					}
				}
			}
		} catch (ex) {
			console.error(ex);
		}
	},

	/**
	 * 단축키를 실행한다.
	 */
	runEvent : function(complexKey, eventKey) {
		try {
			gcm.hkey.event.runGlobalEvent(complexKey, eventKey);
			
			var charCode = eventKey.charCodeAt(0);
			if ((charCode == 13) || (charCode == 39)) {
				return;
			}
			
			var checkShortcut = {};
			var programCd = "";
			eventKey = eventKey.toUpperCase();

			var activeWindowInfo = gcm.win.getActiveWindowInfo();
			var findframe = activeWindowInfo["window"]; // 단축키가 감지된 프레임
			
			var searchEvent = com.data.getMatchedJSON(gcm.hkey.dataList.getID(), [
				{ columnId : "PROGRAM_CD", operator : "==", value : activeWindowInfo["programCd"], logical : "&&" },
				{ columnId : "COMPLEX_KEY", operator : "==", value : complexKey, logical : "&&" },
				{ columnId : "LAST_KEY", operator : "==", value : eventKey, logical : "&&" }
			]);
			
			if (typeof searchEvent == "undefined" || searchEvent.length == 0) {
				searchEvent = com.data.getMatchedJSON(gcm.hkey.dataList.getID(), [
					{ columnId : "PROGRAM_CD", operator : "==", value :'TOP', logical : "&&" },
					{ columnId : "COMPLEX_KEY", operator : "==", value : complexKey, logical : "&&" },
					{ columnId : "LAST_KEY", operator : "==", value : eventKey, logical : "&&" }
				]);
			}

			if (typeof searchEvent != "undefined" && searchEvent.length > 0) {
				var shortuctObj = searchEvent[0];
				if (shortuctObj["EVENT_TYPE"] === "F") {
					if (shortuctObj["EVENT_YN"] == "Y") {
						var funcTokenArr = shortuctObj["EVENT_TARGET"].split(".");
						var runFunction = findframe;
						if (funcTokenArr.length > 0) {
							for (var i = 0; i < funcTokenArr.length; i++) {
								runFunction = runFunction[funcTokenArr[i].trim()];
							}
						} else {
							runFunction = false;
						}

						if (typeof runFunction == "function") {
							runFunction();
						}
					}
				} else if (shortuctObj["EVENT_TYPE"] === "B") {
					if (shortuctObj["EVENT_YN"] == "Y") {
						var runComponent = findframe.$p.getComponentById(shortuctObj["EVENT_TARGET"].trim());
						if (runComponent) {
							runComponent.trigger("click");
						}
					}
				}
			}
			gcm.hkey.dataList.removeColumnFilterAll();
		} catch (ex) {
			console.error(ex);
		}
	},

	/**
	 * 단축키를 추가한다.
	 */
	addEvent : function(object) {
		var successFlag = false;
		try {
			var programCd = (object["PROGRAM_CD"] || "");
			var keyCodeObj = gcm.hkey.event._keyToken(object.shortCutKey.toUpperCase());
			var eventTarget = (object["EVENT_TARGET"] || "");
			var eventName = (object["EVENT_NAME"] || "");
			var eventDetail = (object["EVENT_DETAIL"] || "");
			var eventType = (object["EVENT_TYPE"].toUpperCase() == "B" || object["EVENT_TYPE"].toUpperCase() == "BUTTON") ? "B" : "F";
			var eventYn = (object["EVENT_YN"] || "Y");
			if (programCd == "" || eventTarget == "") {
				return false;
			} else {
				var isKey = com.data.getMatchedJSON(gcm.hkey.dataList.getID(), [
					{ columnId : "PROGRAM_CD", operator : "==", value : object["PROGRAM_CD"], logical : "&&" },
					{ columnId : "COMPLEX_KEY", operator : "==", value : keyCodeObj["COMPLEX_KEY"], logical : "&&" },
					{ columnId : "LAST_KEY", operator : "==", value : keyCodeObj["LAST_KEY"].toUpperCase(), logical : "&&" },
				]);
				
				if (isKey.length > 0) {
					var index = gcm.hkey.dataList.getRealRowIndex(0);
					gcm.hkey.dataList.setRowJSON(insertIdx, {
						"PROGRAM_CD" : programCd,
						"COMPLEX_KEY" : keyCodeObj["COMPLEX_KEY"],
						"LAST_KEY" : keyCodeObj["LAST_KEY"],
						"EVENT_TARGET" : eventTarget,
						"EVENT_NAME" : eventName,
						"EVENT_DETAIL" : eventDetail,
						"EVENT_TYPE" : eventType,
						"EVENT_YN" : eventYn
					}, true);
				} else {
					var insertIdx = gcm.hkey.dataList.insertRow();
					gcm.hkey.dataList.setRowJSON(insertIdx, {
						"PROGRAM_CD" : programCd,
						"COMPLEX_KEY" : keyCodeObj["COMPLEX_KEY"],
						"LAST_KEY" : keyCodeObj["LAST_KEY"],
						"EVENT_TARGET" : eventTarget,
						"EVENT_NAME" : eventName,
						"EVENT_DETAIL" : eventDetail,
						"EVENT_TYPE" : eventType,
						"EVENT_YN" : eventYn
					}, true);
				}
				gcm.hkey.dataList.removeColumnFilterAll();
				return true;
			}
		} catch (ex) {
			console.error(ex);
		}

		return WebSquare.util.getBoolean(successFlag);
	},
	
	/**
	 * 입력된 키에 대한 Key Token을 생성한다.
	 */
	_keyToken : function(keyCode) {
		try {
			var rtnVal = {
				"COMPLEX_KEY" : "",
				"LAST_KEY" : ""
			};
			var token = keyCode.split("+");

			if (token.length > 2) {
				var firstKey = token[0].toUpperCase();
				var secondKey = token[1].toUpperCase();
				var lastKey = isNaN(Number(token[2])) ? token[2] : "NUM" + token[2];
				if (firstKey == "ALT") {
					rtnVal["COMPLEX_KEY"] = "altShiftKey";
					rtnVal["LAST_KEY"] = lastKey;
				} else if (firstKey == "CTRL") {
					if (secondKey == "SHIFT") {
						rtnVal["COMPLEX_KEY"] = "ctrlShiftKey";
						rtnVal["LAST_KEY"] = lastKey;
					} else {
						rtnVal["COMPLEX_KEY"] = "ctrlAltKey";
						rtnVal["LAST_KEY"] = lastKey;
					}
				}
			} else if (token.length == 2) {
				var firstKey = token[0].toUpperCase();
				var lastKey = isNaN(Number(token[1])) ? token[1] : "NUM" + token[1];
				if (firstKey == "CTRL" || firstKey == "CTRLKEY") {
					rtnVal["COMPLEX_KEY"] = "ctrlKey";
					rtnVal["LAST_KEY"] = lastKey;
				} else if (firstKey == "ALT" || firstKey == "ALTKEY") {
					rtnVal["COMPLEX_KEY"] = "altKey";
					rtnVal["LAST_KEY"] = lastKey;
				} else if (firstKey == "SHIFT" || firstKey == "SHIFTKEY") {
					rtnVal["COMPLEX_KEY"] = "shiftKey";
					rtnVal["LAST_KEY"] = lastKey;
				} else if (firstKey == "ALTSHIFTKEY") {
					rtnVal["COMPLEX_KEY"] = "altShiftKey";
					rtnVal["LAST_KEY"] = lastKey;
				} else if (firstKey == "CTRLSHIFTKEY") {
					rtnVal["COMPLEX_KEY"] = "ctrlShiftKey";
					rtnVal["LAST_KEY"] = lastKey;
				} else if (firstKey == "CTRLALTKEY") {
					rtnVal["COMPLEX_KEY"] = "ctrlAltKey";
					rtnVal["LAST_KEY"] = lastKey;
				} else {
					rtnVal["COMPLEX_KEY"] = "singleKey";
					rtnVal["LAST_KEY"] = lastKey;
				}
			} else {
				var lastKey = isNaN(Number(token[0])) ? token[0] : "NUM" + token[0];
				rtnVal["COMPLEX_KEY"] = "singleKey";
				rtnVal["LAST_KEY"] = lastKey;
			}
			return rtnVal;
		} catch (ex) {
			console.error(ex);
		}
	},

	/**
	 * 단축키 등록 삭제 함수
	 */
	delEvent : function(keyCode, options) {
		var rtnVal = true;
		try {
			if (keyCode.lastIndexOf("+") > 0) {
				keyCode = keyCode.toUpperCase();
				var _idx = keyCode.lastIndexOf("+");
				var lastKey = keyCode.slice(_idx + 1).toUpperCase();
				var complexKey = keyCode.slice(0, _idx);
				var complexKeyArr = "";
				if (!isNaN(Number(lastKey))) {
					lastKey = "NUM" + lastKey;
				}

				if (complexKey == "ALT" || complexKey == "ALTKEY") {
					complexKeyArr = "altKey";
				} else if (complexKey == "CTRL" || complexKey == "CTRLKEY") {
					complexKeyArr = "ctrlKey";
				} else if (complexKey == "SHIFT" || complexKey == "SHIFTKEY") {
					complexKeyArr = "shiftKey";
				} else if (complexKey == "ALT+SHIFT" || complexKey == "ALTSHIFTKEY") {
					complexKeyArr = "altShiftKey";
				} else if (complexKey == "CTRL+SHIFT" || complexKey == "CTRLSHIFTKEY") {
					complexKeyArr = "ctrlShiftKey";
				} else if (complexKey == "CTRL+ALT" || complexKey == "CTRLALTKEY") {
					complexKeyArr = "ctrlAltKey";
				} else if (complexKey == "SINGLE" || complexKey == "SINGLEKEY") {
					complexKeyArr = "singleKey";
				}

				var isKey = com.data.getMatchedJSON(gcm.hkey.dataList.getID(), [
					{ columnId : "PROGRAM_CD", operator : "==", value : options["PROGRAM_CD"], logical : "&&" },
					{ columnId : "COMPLEX_KEY", operator : "==", value : complexKeyArr, logical : "&&" },
					{ columnId : "LAST_KEY", operator : "==", value : lastKey, logical : "&&" }
				]);
				
				if (isKey.length > 0) {
					gcm.hkey.dataList.removeRow(0);
				}
				gcm.hkey.dataList.removeColumnFilterAll();
			}
		} catch (ex) {
			console.error(ex);
			rtnVal = false;
		}
		return rtnVal;
	},
	
	/**
	 * 단축키 실행을 막을 대상 Key인지 검사를 수행한다.
	 */
	isPreventKey : function(complexKey, lastKey) {
		var exTag = [ "INPUT", "TEXTAREA", "IFRAME" ];
		var controlKeyList = ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "ctrlKey", "altKey", "ctrlAltKey", "ctrlShiftKey", "altShiftKey" , "Tab", "Escape"];

		var activeTag = document.activeElement.tagName;
		var lastKey = lastKey.toUpperCase();

		if ((exTag.indexOf(activeTag) === -1)) {
			return true;
		} else if ((exTag.indexOf(activeTag) > -1) && (((complexKey === "ctrlKey") && (lastKey === "A"))
			|| ((complexKey === "ctrlKey") && (lastKey === "C")) || ((complexKey === "ctrlKey") && (lastKey === "V"))
			|| ((complexKey === "ctrlKey") && (lastKey === "X")) || ((complexKey === "ctrlKey") && (lastKey === "Y"))
			|| ((complexKey === "ctrlKey") && (lastKey === "Z")) || ((complexKey === "ctrlShiftKey") && (lastKey === "Z")))) {
			return false;
		} else if ((controlKeyList.indexOf(complexKey) !== -1) || (controlKeyList.indexOf(lastKey) !== -1)) {
			return true;
		}
	},
	
	/**
	 * 전역 단축키 실행 함수.
	 * @param {String} complexKey 입력된 복합키 ("ctrlKey", "altKey", "ctrlAltKey", "ctrlShiftKey", "altShiftKey")
	 * @param {String} eventKey 입력된 키 ("F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Tab", "Escape", "0~9", "a-z", "A-Z", 특수문자(!@#~) 등)
	 */
	runGlobalEvent : function(complexKey, eventKey) {
		try {
			
			// F1 키를 눌렀을 때에 사용자가 정의한 스크립트만 실행되도록 하기 위해서
			// 브라우저의 Function Key 동작을 중지키려면 gcm.IS_USE_BROWSER_SHORTCUT 속성을 false로 설정해야 한다. (기본값은 true임)
			if (eventKey === "F1") {
				// com.win.alert("F1가 실행 되었습니다.");
			// Escape Key가 입력되면 맨 마지막에 오픈된 Alert 또는 Confirm 창을 닫는다.
			} else if (eventKey === "Escape") {
				var lastPopupIdx = $p.getPopupWindowList().length - 1; 
				if (lastPopupIdx >= 0) {
					var popupFrameId = $p.getPopupWindowList()[lastPopupIdx].$p.getFrameId();
					var messageType = $p.getPopupWindowList()[lastPopupIdx].com.data.getParameter("messageType");
					if (!com.util.isEmpty(messageType) && ((messageType === "alert") || (messageType === "confirm"))) {
						var popupId = popupFrameId.substring(0, popupFrameId.lastIndexOf("_wframe"));
						$p.closePopup(popupId);
					}
				}
			}
		} catch (ex) {
			console.error(ex);
		}
	}
};

/**
 * 사용자 지정 단축키 기능을 초기화한다.
 * 
 * @date 2019.03.26
 * @memberOf gcm.hkey
 * @author Inswave Systems
 * @param {Object} $p WFrame Scope 내 $p 객체
 */
gcm.hkey.init = function($p) {
	try {
		var dataListCreationOpt = {
			id : "dlt_shortcutList",
			type : "dataList",
			option : {
				"baseNode" : "list",
				"repeatNode" : "map",
				"saveRemovedData" : "true"
			},
			columnInfo : [
				{"id" : "SHORTCUT_SEQ", "dataType" : "text", "name" : "단축키순번"},
				{"id" : "PROGRAM_CD", "dataType" : "text", "name" : "프로그램코드"},
				{"id" : "COMPLEX_KEY", "dataType" : "text", "name" : "복합키"},
				{"id" : "LAST_KEY", "dataType" : "text", "name" : "단축키"},
				{"id" : "EVENT_TYPE", "dataType" : "text", "name" : "이벤트타입"},
				{"id" : "EVENT_TARGET", "dataType" : "text", "name" : "이벤트타겟"},
				{"id" : "EVENT_DETAIL", "dataType" : "text", "name" : "이벤트설명"},
				{"id" : "EVENT_YN", "dataType" : "text", "name" : "사용여부"},
				{"id" : "EVENT_NAME", "dataType" : "text", "name" : "이벤트명"}
			]
		};
	
		$p.data.create(dataListCreationOpt);
		gcm.hkey.dataList = $p.getComponentById("dlt_shortcutList");
			
		var shortcutTargetElement = document;
		if (shortcutTargetElement.addEventListener) {
			shortcutTargetElement.addEventListener('keydown', gcm.hkey.event.keydownEvent);
		} else if (shortcutTargetElement.attachEvent)  {
			shortcutTargetElement.attachEvent('keydown', gcm.hkey.event.keydownEvent);
		}
	} catch (ex) {
		console.error(ex);
	}
};

/**
 * 단축키 사용 여부를 설정한다.
 * 
 * @date 2019.03.26
 * @memberOf gcm.hkey
 * @author Inswave Systems
 * @param {String} shortcutFlag 단축키 사용 여부 (Y: 사용, N: 미사용)
 */
gcm.hkey.isUseShortCut = function(shortcutFlag) {
	try {
		if (shortcutFlag == "Y") {
			gcm.hkey.event.loadingEvent = "Y";
			document.onkeydown = gcm.hkey.event["checkEvent"];
		} else {
			gcm.hkey.event.loadingEvent = "N";
			document.onkeydown = null;
		}
	} catch (ex) {
		console.error(ex);
	}
};

/**
 * 컴포넌트에 설정된 이벤트를 중지시킨다.
 * 
 * @date 2019.03.13
 * @memberOf gcm.hkey
 * @author Inswave Systems
 * @param {String} _targetComp : 설정 컴포넌트 객체ID
 * @param {Boolean} _flag : 이벤트 설정 여부 값 [default: false(실행), true(중지)]
 * @param {Object} _eventList : 중지 이벤트 리스트 값(배열) [default:null (모든 이벤트)]
 */
gcm.hkey.setEventPause = function(_targetComp, _flag, _eventList) {
	try {
		var comp = $p.getComponentById(_targetComp);
		var flag = WebSquare.util.getBoolean(_flag);
		var eventList = typeof _eventList != "undefined" ? _eventList : null;
		if (typeof comp == "undefined")
			return -1;

		if (comp.options.pluginName == "dataList") {
			comp.setBroadcast(flag);

			if (flag) {
				comp.broadcast({
					"linkedDataList" : [ "notifyDataChanged" ],
					"gridView" : [ "notifyDataChanged" ],
					"generalComp" : "both"
				});
			}

			comp.setEventPause(eventList, flag);
			for (var i in comp.childCompHash) {
				var childComp = ngmf.object(comp.childCompHash[i].id);
				if (typeof childComp != "undefined") {
					childComp.setEventPause(eventList, flag);
				}
			}

			for (var i in comp.refCompHash) {
				var refComp = ngmf.object(comp.refCompHash[i].id);
				if (typeof refComp != "undefined") {
					refComp.setEventPause(eventList, flag);
				}
			}
		} else {
			comp.setEventPause(eventList, !flag);
		}
	} catch (ex) {
		console.error(ex);
	}
};


// =============================================================================
/**
 * 외부 솔루션 연동과 관련된 함수를 작성한다.
 *
 * @author Inswave Systems
 * @class ext
 * @namespace gcm.ext
 */
// =============================================================================

gcm.ext = {};
