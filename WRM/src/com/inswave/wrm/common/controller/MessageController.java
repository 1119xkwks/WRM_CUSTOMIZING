package com.inswave.wrm.common.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import com.inswave.wrm.common.service.MessageService;
import com.inswave.wrm.util.Result;

@Controller
public class MessageController {
	
	@Autowired
	private MessageService messageService;
	
	@RequestMapping("/message/searchMessageList")
	@ResponseBody
	public Map<String, Object> searchMessageList(@RequestBody Map<String, Object> param) {
		Result result = new Result();
		
		try {
			result.setData("dlt_message", messageService.selectMessageList((Map) param.get("dma_search")));
			result.setStatusMsg(result.STATUS_SUCESS, "다국어 메시지 리스트가 조회되었습니다.");
		} catch(Exception ex) {
			result.setMsg(result.STATUS_ERROR, "다국어 메시지 리스트를 가져오는 도중 오류가 발생하였습니다.");
		}
		
		return result.getResult();
	}
	
	@RequestMapping("/message/saveMessage")
	@ResponseBody
	public Map<String, Object> saveMessage(@RequestBody Map<String, Object> param) {
		Result result = new Result();
		
		try {
			Map hash = new HashMap();
			hash = messageService.saveMessage((List) param.get("dlt_msg"));
			result.setData("dlt_msg", hash);
			result.setStatusMsg(result.STATUS_SUCESS, "다국어 메시지 데이터가 수정되었습니다.");
		} catch(Exception ex) {
			result.setMsg(result.STATUS_ERROR, "다국어 메시지 저장도중 오류가 발생하였습니다.");
		}
		
		return result.getResult();
	}
	
	
	@RequestMapping("/message/getLanguagePack/{lang}")
	public void getLanguagePack(@PathVariable("lang") String lang, HttpServletResponse response) {
		try {
			Map param = new HashMap();
			param.put("LANG", lang);
			String msgLang = messageService.getLanguagePack(param);
			
			response.setContentType("application/javascript");
			response.setCharacterEncoding("utf-8");
			response.getOutputStream().write(msgLang.getBytes("utf-8"));
			response.getOutputStream().flush();
		} catch(Exception ex) {
			ex.printStackTrace();
		}
	}
	
	@RequestMapping("/message/getAllMessage/{lang}")
	@ResponseBody
	public Map<String, Object> getAllMessage(@PathVariable("lang") String lang) {
		Result result = new Result();
		
		try {
			Map param = new HashMap();
			param.put("LANG", lang);
			result.setData("message", messageService.getAllMessage(param));
			result.setStatusMsg(result.STATUS_SUCESS, "다국어 메시지 리스트가 조회되었습니다.");
		} catch(Exception ex) {
			result.setMsg(result.STATUS_ERROR, "다국어 메시지 리스트를 가져오는 도중 오류가 발생하였습니다.");
		}
		
		return result.getResult();
	}
}
