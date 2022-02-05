package com.inswave.wrm.common.service;

import java.util.List;
import java.util.Map;

public interface MessageService {

	public List<Map> selectMessageList(Map param);
	
	public Map saveMessage(List param);
	
	public String getLanguagePack(Map param);

	public Map getAllMessage(Map param);
}
