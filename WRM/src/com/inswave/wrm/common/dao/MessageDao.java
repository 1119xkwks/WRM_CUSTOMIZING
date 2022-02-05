package com.inswave.wrm.common.dao;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Repository;

@Repository("messageDao")
public interface MessageDao {
	
	//다국어 메시지 리스트 조회
	public List<Map> selectMessageList(Map param);
	
	public int insertMessage(Map param);
	
	public int updateMessage(Map param);
	
	public int deleteMessage(Map param);
	
	public List<Map> selectAllMessage(Map param);
}
