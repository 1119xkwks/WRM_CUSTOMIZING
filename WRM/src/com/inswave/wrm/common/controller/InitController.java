package com.inswave.wrm.common.controller;

import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.Iterator;
import java.util.Properties;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

import com.inswave.wrm.common.service.LoginService;
import com.inswave.wrm.common.service.MenuService;
import com.inswave.wrm.member.service.MemberService;
import com.inswave.wrm.util.PageURIUtil;
import com.inswave.wrm.util.Result;
import com.inswave.wrm.util.UserInfo;

@Controller
public class InitController {
	
	@Autowired
	private MemberService service;
	
	@Autowired
	private LoginService loginService;
	
	@Autowired
	private MenuService menuService;

	/**
	 * 기본 Root Url 처리
	 * 
	 * @date 2017.12.22
	 * @author Inswave Systems
	 */
	@RequestMapping(value = "/", method = RequestMethod.GET)
	public String IndexBase(HttpServletRequest request, Model model) throws Exception {
		model.addAttribute("movePage", loginService.getLoginPage(request.getParameter("w2xPath")));
		return "websquare/websquare";
	}
	
	/**
	 * Popup Url 처리
	 * 
	 * @date 2017.12.22
	 * @author Inswave Systems
	 */
	@RequestMapping(value = "/popup", method = RequestMethod.GET)
	public String IndexWebSquare(HttpServletRequest request, Model model) throws Exception {
		model.addAttribute("movePage", loginService.getLoginPage(request.getParameter("w2xPath")));
		return "websquare/popup";
	}
}
