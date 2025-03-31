---
layout: notes
pagination:
  enabled: true
---

<div class="post-list">
{% for post in site.posts %}
      <div class="note-content">{{ post.content | strip }}
      <!-- <div class="note-meta"> -->
        <span class="note-date">{{ post.date | date: "%y%m%d" }}</span>
        {% if post.source %}
          <span class="note-source">
            {{ post.source }}
          </span>
        {% endif %}
        </div>
      <!-- </div> -->
{% endfor %}
</div> 