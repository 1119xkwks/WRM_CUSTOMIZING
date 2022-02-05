/**
 * 화면 초기 로딩
 * @lastUpdate 2016.08.28 
 * @author Inswave Systems
 * @since 2016.08.28
 */
scwin.initMainLoad = function() {
	wfm_side.getWindow().scwin.getInitData();
	
	var deviceWidth = com.num.parseFloat($("body").css("width"));
	if (deviceWidth < 1280) {
		$(".wrap").removeClass("show_menu");
		$(".btn_toggle_menu").removeClass("on");
	}
	
	gcm.win.addEventOnBeforeUnload();
};

/**
 * TabControl의 모든 메뉴 닫기 버튼 이벤트
 * @lastUpdate 2016.08.28
 * @author Inswave Systems
 * @since 2016.08.28
 */
scwin.btn_CloseAll_onclick = function() {
	var cnt = tac_layout.getTabCount();
	for (var i = cnt; i > 0; i--) {
		tac_layout.deleteTab(i);
	}
};

/**
 * header menu 생성
 */
scwin.setHeaderMenu = function() {
	wfm_header.getWindow().scwin.setGenerator(); //메뉴 생성
	wfm_header.getWindow().scwin.setMenuCss(); //메뉴 css 적용
};

scwin.getLayoutId = function() {
	if (typeof $p.top().$p.getComponentById("tac_layout") === "object") {
		return "T";
	} else if (typeof $p.top().$p.getComponentById("wdc_main") === "object") {
		return "M";
	} else if (typeof $p.top().$p.getComponentById("wfm_layout") === "object") {
		return "S";
	}
	return null;
};

scwin.isMobileSize = function() {
	var size = {
		width: window.innerWidth || document.body.clientWidth,
		height: window.innerHeight || document.body.clientHeight
	};
	
	if (size.width <= 1024) {
		return true;
	} else {
		return false;
	}
};

scwin.closeBeforePage = function(frameObj) {
	var focusComp = com.util.getComponent(WebSquare.util.getFocusedComponentId());
	if(!com.util.isEmpty(focusComp) && !com.util.isEmpty(focusComp.getPluginName) && focusComp.getPluginName() =="input"){
		focusComp.commit();
	}

	var isUserFuncModified = false;

	if(typeof frameObj.getObj("scwin").beforeCloseModifiedCheck ==="function"){
		isUserFuncModified = frameObj.getObj("scwin").beforeCloseModifiedCheck() || false;
	}
	var isMoidfied = gcm.win.beforeCloseModifiedCheck(frameObj.id);
	isConfirm = isMoidfied || isUserFuncModified;

	if(isConfirm){
		if(confirm(com.data.getMessage("com.cfm.0007") ||"창을 닫으시겠습니까? 변경사항이 저장되지 않을 수 있습니다")){
			frameObj.setUserData("isMove",false);
			return true;
		} else {
			frameObj.setUserData("isMove",true);
			return false;
		}
	}else{
		return true;
	}
};